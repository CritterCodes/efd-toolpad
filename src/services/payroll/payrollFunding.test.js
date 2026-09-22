import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  batchesList: vi.fn(),
  listPayrollCandidates: vi.fn(),
  retrieveBalance: vi.fn(),
  createTopup: vi.fn(),
  notifyAllAdmins: vi.fn(async () => ({})),
  findOne: vi.fn(),
}));

vi.mock('@/lib/database', () => ({ db: { connect: vi.fn(async () => ({ collection: () => ({ findOne: mocks.findOne, updateOne: vi.fn() }) })) } }));
vi.mock('@/app/api/repairPayrollBatches/model', () => ({ default: { list: mocks.batchesList } }));
vi.mock('@/app/api/repairs/payroll/service', () => ({ listPayrollCandidates: mocks.listPayrollCandidates, markPayrollBatchPaid: vi.fn() }));
vi.mock('@/lib/stripeConnect', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, isStripeConfigured: () => true, stripeMode: () => 'test', retrieveBalance: mocks.retrieveBalance, createTopup: mocks.createTopup };
});
vi.mock('@/lib/notificationService', () => ({ notifyAllAdmins: mocks.notifyAllAdmins }));
vi.mock('@/lib/appUrls', () => ({ adminBase: () => 'http://test' }));

import { computeFundingNeed, normalizeFundingSettings, fundingIdempotencyKey, runFundingCheck, FUNDING_DEFAULTS } from './payrollFunding';

const MON = new Date('2026-09-21T15:00:00Z');

describe('payroll funding math (pure)', () => {
  it('target = projected × (1 + buffer) + floor; shortfall against what Stripe will have by Wednesday', () => {
    const need = computeFundingNeed({ projected: 800, balance: 350, settings: { enabled: true, floor: 1500, bufferPct: 10, minimumTopup: 25 } });
    expect(need).toEqual({ projected: 800, target: 2380, balance: 350, shortfall: 2030, topup: 2030 });
  });

  it('a shortfall under the minimum is ignored; a funded balance pulls nothing', () => {
    expect(computeFundingNeed({ projected: 500, balance: 2040, settings: { floor: 1500, bufferPct: 10, minimumTopup: 25 } }).topup).toBe(0); // short $10
    expect(computeFundingNeed({ projected: 500, balance: 5000, settings: { floor: 1500, bufferPct: 10, minimumTopup: 25 } })).toMatchObject({ shortfall: 0, topup: 0 });
  });

  it('settings clamp and default sensibly', () => {
    expect(normalizeFundingSettings(undefined)).toEqual({ ...FUNDING_DEFAULTS });
    expect(normalizeFundingSettings({ enabled: 'yes', floor: -5, bufferPct: 400, minimumTopup: 0 })).toEqual({ enabled: false, floor: 0, bufferPct: 100, minimumTopup: 1 });
  });

  it('one top-up per calendar day', () => {
    expect(fundingIdempotencyKey(MON)).toBe('payroll-funding-2026-09-21');
  });
});

describe('the Monday check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.batchesList.mockResolvedValue([{ batchID: 'b1', userName: 'Michelle', laborPay: 275, salePay: 0 }]);
    mocks.listPayrollCandidates.mockResolvedValue([{ userID: 'owner', userName: 'Jacob', laborPay: 525 }]);
  });

  it('does nothing while switched off', async () => {
    mocks.findOne.mockResolvedValue({ business: { payroll: { funding: { enabled: false } } } });
    const r = await runFundingCheck({ now: MON });
    expect(r.skipped).toMatch(/off/);
    expect(mocks.retrieveBalance).not.toHaveBeenCalled();
  });

  it('tops up the shortfall with a per-day idempotency key and tells admins', async () => {
    mocks.findOne.mockResolvedValue({ business: { payroll: { funding: { enabled: true, floor: 1500, bufferPct: 10, minimumTopup: 25 } } } });
    mocks.retrieveBalance.mockResolvedValue({ available: [{ currency: 'usd', amount: 20000 }], pending: [{ currency: 'usd', amount: 15000 }] });
    mocks.createTopup.mockResolvedValue({ id: 'tu_1', status: 'pending', expected_availability_date: 1758931200 });

    const r = await runFundingCheck({ now: MON });
    // projected 800 → target 2380; balance 350 → pull 2030
    expect(r.need).toMatchObject({ projected: 800, target: 2380, topup: 2030 });
    expect(mocks.createTopup).toHaveBeenCalledWith(expect.objectContaining({ amountCents: 203000, idempotencyKey: 'payroll-funding-2026-09-21' }));
    expect(r.topup).toMatchObject({ id: 'tu_1', amount: 2030 });
    expect(mocks.notifyAllAdmins.mock.calls[0][0].title).toMatch(/Pulled \$2,030\.00/);
  });

  it('dry run reports the pull without moving money', async () => {
    mocks.findOne.mockResolvedValue({ business: { payroll: { funding: { enabled: true, floor: 1500, bufferPct: 10, minimumTopup: 25 } } } });
    mocks.retrieveBalance.mockResolvedValue({ available: [{ currency: 'usd', amount: 20000 }], pending: [] });
    const r = await runFundingCheck({ now: MON, dryRun: true });
    expect(r.wouldTopup).toBe(2180);
    expect(mocks.createTopup).not.toHaveBeenCalled();
  });

  it('an unverified bank account is loud, actionable, and never throws', async () => {
    mocks.findOne.mockResolvedValue({ business: { payroll: { funding: { enabled: true } } } });
    mocks.retrieveBalance.mockResolvedValue({ available: [], pending: [] });
    mocks.createTopup.mockRejectedValue(new Error('You must verify a bank account before creating top-ups.'));
    const r = await runFundingCheck({ now: MON });
    expect(r.error).toMatch(/verify a bank account/);
    const call = mocks.notifyAllAdmins.mock.calls[0][0];
    expect(call.priority).toBe('high');
    expect(call.message).toMatch(/verify the business bank account/);
  });
});
