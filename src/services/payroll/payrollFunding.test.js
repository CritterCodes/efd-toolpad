import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  batchesList: vi.fn(),
  listPayrollCandidates: vi.fn(),
  retrieveBalance: vi.fn(),
  retrievePlatformAccount: vi.fn(),
  createTopup: vi.fn(),
  notifyAllAdmins: vi.fn(async () => ({})),
  findOne: vi.fn(),
}));

vi.mock('@/lib/database', () => ({ db: { connect: vi.fn(async () => ({ collection: () => ({ findOne: mocks.findOne, updateOne: vi.fn() }) })) } }));
vi.mock('@/app/api/repairPayrollBatches/model', () => ({ default: { list: mocks.batchesList } }));
vi.mock('@/app/api/repairs/payroll/service', () => ({ listPayrollCandidates: mocks.listPayrollCandidates, markPayrollBatchPaid: vi.fn() }));
vi.mock('@/lib/stripeConnect', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    isStripeConfigured: () => true,
    stripeMode: () => 'test',
    retrieveBalance: mocks.retrieveBalance,
    retrievePlatformAccount: mocks.retrievePlatformAccount,
    createTopup: mocks.createTopup,
  };
});

/** A Stripe account object with the given payout schedule. */
const accountOn = (interval) => ({ settings: { payouts: { schedule: { interval } } } });
vi.mock('@/lib/notificationService', () => ({ notifyAllAdmins: mocks.notifyAllAdmins }));
vi.mock('@/lib/appUrls', () => ({ adminBase: () => 'http://test' }));

import { computeFundingNeed, normalizeFundingSettings, fundingIdempotencyKey, runFundingCheck, FUNDING_DEFAULTS } from './payrollFunding';

const MON = new Date('2026-09-21T15:00:00Z');

describe('payroll funding math (pure)', () => {
  it('target = projected × (1 + buffer) + floor; shortfall against what Stripe will have by Wednesday', () => {
    const need = computeFundingNeed({ projected: 800, balance: 350, settings: { enabled: true, floor: 1500, bufferPct: 10, minimumTopup: 25, maxTopup: 5000 } });
    expect(need).toEqual({ projected: 800, target: 2380, balance: 350, shortfall: 2030, topup: 2030, capped: false });
  });

  it('never pulls more than the cap in one run, and says so', () => {
    const need = computeFundingNeed({ projected: 800, balance: 350, settings: { floor: 1500, bufferPct: 10, minimumTopup: 25, maxTopup: 500 } });
    expect(need).toMatchObject({ shortfall: 2030, topup: 500, capped: true });
    // defaults: $300 floor, $500 cap — safe for a shop with rent due
    expect(computeFundingNeed({ projected: 600, balance: 0 })).toMatchObject({ target: 960, topup: 500, capped: true });
  });

  it('a shortfall under the minimum is ignored; a funded balance pulls nothing', () => {
    expect(computeFundingNeed({ projected: 500, balance: 2040, settings: { floor: 1500, bufferPct: 10, minimumTopup: 25 } }).topup).toBe(0); // short $10
    expect(computeFundingNeed({ projected: 500, balance: 5000, settings: { floor: 1500, bufferPct: 10, minimumTopup: 25 } })).toMatchObject({ shortfall: 0, topup: 0 });
  });

  it('settings clamp and default sensibly', () => {
    expect(normalizeFundingSettings(undefined)).toEqual({ ...FUNDING_DEFAULTS });
    expect(normalizeFundingSettings({ enabled: 'yes', floor: -5, bufferPct: 400, minimumTopup: 0, maxTopup: 1 })).toEqual({ enabled: false, floor: 0, bufferPct: 100, minimumTopup: 1, maxTopup: 25 });
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
    mocks.retrievePlatformAccount.mockResolvedValue(accountOn('manual'));
  });

  it('does nothing while switched off', async () => {
    mocks.findOne.mockResolvedValue({ business: { payroll: { funding: { enabled: false } } } });
    const r = await runFundingCheck({ now: MON });
    expect(r.skipped).toMatch(/off/);
    expect(mocks.retrieveBalance).not.toHaveBeenCalled();
  });

  /**
   * The settings card has to answer "what does Wednesday need, and does Stripe have it?" BEFORE the
   * switch is on — that is the number you decide on, and it was unavailable at exactly the moment it
   * mattered (owner, 2026-09-28, waiting on a Friday payment).
   */
  /**
   * THE FALSE "FUNDED" (owner, 2026-09-28). Pressing Fund Stripe now reported
   * "funded: $1,039.13 covers $624.50" while the account held $0.00 available, $1,039.13 pending,
   * and an AUTOMATIC payout schedule that would sweep that money to the bank the day it settled.
   * Pending can only be spent by a Connect transfer when payouts are manual.
   */
  describe('pending money only counts on a manual payout schedule', () => {
    const balanceOf = (availableUsd, pendingUsd) => ({
      available: [{ currency: 'usd', amount: availableUsd * 100 }],
      pending: [{ currency: 'usd', amount: pendingUsd * 100 }],
    });

    beforeEach(() => {
      mocks.findOne.mockResolvedValue({ business: { payroll: { funding: { enabled: true, floor: 300, bufferPct: 10, minimumTopup: 25, maxTopup: 500 } } } });
      // EFD's actual position that night: nothing available, $1,039.13 still settling.
      mocks.retrieveBalance.mockResolvedValue(balanceOf(0, 1039.13));
      mocks.listPayrollCandidates.mockResolvedValue([{ userID: 'owner', userName: 'jacob engel', laborPay: 295 }]);
      mocks.batchesList.mockResolvedValue([]);
      mocks.createTopup.mockResolvedValue({ id: 'tu_1', status: 'pending' });
    });

    it('does NOT count pending on an automatic schedule — it tops up instead', async () => {
      mocks.retrievePlatformAccount.mockResolvedValue(accountOn('daily'));
      const r = await runFundingCheck({ now: MON, notify: false });

      expect(r.automaticPayouts).toBe(true);
      expect(r.spendable).toBe(0);                       // $1,039.13 is leaving for the bank
      expect(r.need).toMatchObject({ target: 624.5, shortfall: 624.5, topup: 500, capped: true });
      expect(mocks.createTopup).toHaveBeenCalled();
    });

    it('counts pending on a manual schedule, and says plainly that nothing moved', async () => {
      mocks.retrievePlatformAccount.mockResolvedValue(accountOn('manual'));
      const r = await runFundingCheck({ now: MON, notify: false });

      expect(r.automaticPayouts).toBe(false);
      expect(r.spendable).toBe(1039.13);
      expect(r.need.topup).toBe(0);
      expect(r.skipped).toMatch(/No top-up needed/);     // never phrased as though money was pulled
      expect(r.skipped).not.toMatch(/^funded:/);
      expect(mocks.createTopup).not.toHaveBeenCalled();
    });

    it('when the schedule cannot be read, counts pending rather than pulling on a guess', async () => {
      mocks.retrievePlatformAccount.mockRejectedValue(new Error('permission denied'));
      const r = await runFundingCheck({ now: MON, notify: false });

      expect(r.scheduleKnown).toBe(false);
      expect(r.automaticPayouts).toBe(false);
      expect(r.spendable).toBe(1039.13);
      expect(mocks.createTopup).not.toHaveBeenCalled();
    });
  });

  describe('previewing while switched off', () => {
    beforeEach(() => {
      mocks.findOne.mockResolvedValue({ business: { payroll: { funding: { enabled: false, floor: 300, bufferPct: 10, minimumTopup: 25, maxTopup: 500 } } } });
      mocks.retrieveBalance.mockResolvedValue({ available: [{ currency: 'usd', amount: 10000 }], pending: [{ currency: 'usd', amount: 0 }] });
    });

    it('computes the numbers anyway, and says they are hypothetical', async () => {
      const r = await runFundingCheck({ now: MON, dryRun: true, preview: true, notify: false });

      expect(r.previewedWhileOff).toBe(true);
      expect(r.skipped).toBeUndefined();
      expect(r.due.projected).toBe(800);                 // 275 finalized + 525 unbatched
      expect(r.need).toMatchObject({ target: 1180, balance: 100, topup: 500, capped: true });
      expect(r.wouldTopup).toBe(500);
    });

    it('still cannot move money — a preview never reaches the top-up', async () => {
      await runFundingCheck({ now: MON, dryRun: true, preview: true, notify: false });
      expect(mocks.createTopup).not.toHaveBeenCalled();
      expect(mocks.notifyAllAdmins).not.toHaveBeenCalled();
    });

    it('refuses to look past the switch for anything but a dry run', async () => {
      // preview without dryRun is a REAL run, and a real run obeys the switch.
      const r = await runFundingCheck({ now: MON, preview: true });
      expect(r.skipped).toMatch(/off/);
      expect(mocks.createTopup).not.toHaveBeenCalled();
    });
  });

  it('tops up the shortfall with a per-day idempotency key and tells admins', async () => {
    mocks.findOne.mockResolvedValue({ business: { payroll: { funding: { enabled: true, floor: 1500, bufferPct: 10, minimumTopup: 25, maxTopup: 5000 } } } });
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
    mocks.findOne.mockResolvedValue({ business: { payroll: { funding: { enabled: true, floor: 1500, bufferPct: 10, minimumTopup: 25, maxTopup: 5000 } } } });
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
