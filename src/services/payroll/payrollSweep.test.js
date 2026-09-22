import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  readFundingSettings: vi.fn(),
  projectPayrollDue: vi.fn(),
  retrieveBalance: vi.fn(),
  retrievePlatformAccount: vi.fn(),
  createPlatformPayout: vi.fn(),
  notifyAllAdmins: vi.fn(async () => ({})),
}));

vi.mock('@/services/payroll/payrollFunding', () => ({ readFundingSettings: mocks.readFundingSettings, projectPayrollDue: mocks.projectPayrollDue }));
vi.mock('@/lib/stripeConnect', async (importOriginal) => {
  const real = await importOriginal();
  return { ...real, isStripeConfigured: () => true, stripeMode: () => 'test', retrieveBalance: mocks.retrieveBalance, retrievePlatformAccount: mocks.retrievePlatformAccount, createPlatformPayout: mocks.createPlatformPayout };
});
vi.mock('@/lib/notificationService', () => ({ notifyAllAdmins: mocks.notifyAllAdmins }));
vi.mock('@/lib/appUrls', () => ({ adminBase: () => 'http://test' }));

import { computeSweep, sweepIdempotencyKey, runPayrollSweep } from './payrollSweep';

const THU = new Date('2026-09-24T16:00:00Z');
const settings = { enabled: true, floor: 300, bufferPct: 10, minimumTopup: 25, maxTopup: 500 };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.readFundingSettings.mockResolvedValue(settings);
  mocks.projectPayrollDue.mockResolvedValue({ projected: 400, payees: ['Jacob'] });
  mocks.retrieveBalance.mockResolvedValue({ available: [{ currency: 'usd', amount: 150000 }], pending: [] });
  mocks.retrievePlatformAccount.mockResolvedValue({ settings: { payouts: { schedule: { interval: 'manual' } } } });
  mocks.createPlatformPayout.mockResolvedValue({ id: 'po_1', status: 'pending', arrival_date: 1758931200 });
});

describe('computeSweep (pure)', () => {
  it('keeps floor + projected × (1 + buffer) and sweeps the rest', () => {
    expect(computeSweep({ available: 1500, projected: 400, settings })).toEqual({ available: 1500, projected: 400, keep: 740, excess: 760, sweep: 760 });
  });
  it('an excess under the minimum is left alone; a balance under the keep sweeps nothing', () => {
    expect(computeSweep({ available: 760, projected: 400, settings }).sweep).toBe(0); // $20 over
    expect(computeSweep({ available: 500, projected: 400, settings })).toMatchObject({ excess: 0, sweep: 0 });
  });
  it('one key per calendar day', () => {
    expect(sweepIdempotencyKey(THU)).toBe('payroll-sweep-2026-09-24');
  });
});

describe('runPayrollSweep', () => {
  it('manual schedule + excess → one payout of the excess with the daily idempotency key', async () => {
    const out = await runPayrollSweep({ now: THU });
    expect(out.payout).toMatchObject({ id: 'po_1', amount: 760 });
    const call = mocks.createPlatformPayout.mock.calls[0][0];
    expect(call.amountCents).toBe(76000);
    expect(call.idempotencyKey).toBe('payroll-sweep-2026-09-24');
    expect(mocks.notifyAllAdmins).toHaveBeenCalledTimes(1);
  });

  it('automatic schedule → report only, nothing moves', async () => {
    mocks.retrievePlatformAccount.mockResolvedValue({ settings: { payouts: { schedule: { interval: 'weekly', weekly_anchor: 'thursday' } } } });
    const out = await runPayrollSweep({ now: THU });
    expect(out.skipped).toMatch(/weekly \(thursday\)/);
    expect(out.plan.sweep).toBe(760);
    expect(mocks.createPlatformPayout).not.toHaveBeenCalled();
  });

  it('dry run reports the amount and moves nothing; off switch skips everything', async () => {
    expect((await runPayrollSweep({ now: THU, dryRun: true })).wouldPayout).toBe(760);
    expect(mocks.createPlatformPayout).not.toHaveBeenCalled();
    vi.clearAllMocks();
    mocks.readFundingSettings.mockResolvedValue({ ...settings, enabled: false });
    expect((await runPayrollSweep({ now: THU })).skipped).toMatch(/off/);
    expect(mocks.retrieveBalance).not.toHaveBeenCalled();
  });

  it('nothing above the floor → skipped with the numbers; a Stripe error never throws', async () => {
    mocks.retrieveBalance.mockResolvedValue({ available: [{ currency: 'usd', amount: 50000 }], pending: [] });
    expect((await runPayrollSweep({ now: THU })).skipped).toMatch(/nothing above the floor/);
    mocks.retrieveBalance.mockRejectedValue(new Error('stripe down'));
    const out = await runPayrollSweep({ now: THU });
    expect(out.error).toBe('stripe down');
    expect(out.payout).toBeNull();
  });
});
