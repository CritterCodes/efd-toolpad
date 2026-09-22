import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listPayrollCandidates: vi.fn(),
  createPayrollBatch: vi.fn(),
  finalizePayrollBatch: vi.fn(),
  markPayrollBatchPaid: vi.fn(),
  getOwnerOperatorUserIDs: vi.fn(),
  notifyAllAdmins: vi.fn(),
  runConnectPayouts: vi.fn(async () => ({ paid: [], skipped: [], shortfall: [], errors: [] })),
  nudgeUnpaidPayees: vi.fn(async () => []),
}));

vi.mock('@/app/api/repairs/payroll/service', () => ({
  listPayrollCandidates: mocks.listPayrollCandidates,
  createPayrollBatch: mocks.createPayrollBatch,
  finalizePayrollBatch: mocks.finalizePayrollBatch,
  markPayrollBatchPaid: mocks.markPayrollBatchPaid,
  getOwnerOperatorUserIDs: mocks.getOwnerOperatorUserIDs,
}));
vi.mock('@/lib/notificationService', () => ({ notifyAllAdmins: mocks.notifyAllAdmins }));
vi.mock('@/lib/appUrls', () => ({ adminBase: () => 'http://test' }));
vi.mock('@/services/payroll/connectPayouts', () => ({ runConnectPayouts: mocks.runConnectPayouts, nudgeUnpaidPayees: mocks.nudgeUnpaidPayees }));
vi.mock('@/services/payroll/payoutCadence', () => ({ listDailyPayees: vi.fn(async () => []) }));

import { runWeeklyPayroll, lastClosedWeekStart } from './autoPayroll';

const MON_SEP_21 = new Date('2026-09-23T11:00:00Z'); // the cron fires Wednesday morning (name kept; the week logic is what's under test)

describe('weekly payroll run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.finalizePayrollBatch.mockResolvedValue({});
    mocks.markPayrollBatchPaid.mockResolvedValue({});
    mocks.notifyAllAdmins.mockResolvedValue({});
  });

  it('closes Sun–Sat weeks strictly before the current one (Wed 9/23 → week of Sun 9/13)', () => {
    const cutoff = lastClosedWeekStart(MON_SEP_21);
    expect(cutoff.getDay()).toBe(0);
    expect(cutoff.toLocaleDateString('en-CA')).toBe('2026-09-13');
    // Saturday night still resolves to the week that started the previous Sunday
    expect(lastClosedWeekStart(new Date('2026-09-26T23:00:00')).toLocaleDateString('en-CA')).toBe('2026-09-13');
    // Sunday morning rolls forward
    expect(lastClosedWeekStart(new Date('2026-09-27T09:00:00')).toLocaleDateString('en-CA')).toBe('2026-09-20');
  });

  it('finalizes every closed week (missed ones too) and never marks anything paid itself — Stripe is the only path', async () => {
    mocks.getOwnerOperatorUserIDs.mockResolvedValue(['owner-1']);
    mocks.listPayrollCandidates.mockResolvedValue([
      { userID: 'owner-1', userName: 'Jacob', weekStart: new Date('2026-09-07T00:00:00Z') },
      { userID: 'owner-1', userName: 'Jacob', weekStart: new Date('2026-09-14T00:00:00Z') },
    ]);
    mocks.createPayrollBatch
      .mockResolvedValueOnce({ batchID: 'b1', laborPay: 20, salePay: 0, laborHours: 0.4 })
      .mockResolvedValueOnce({ batchID: 'b2', laborPay: 595, salePay: 0, laborHours: 11.9 });
    mocks.runConnectPayouts.mockResolvedValueOnce({ paid: [], skipped: [{ batchID: 'b1', userID: 'owner-1', userName: 'Jacob', amount: 20, reason: 'no Stripe account connected' }, { batchID: 'b2', userID: 'owner-1', userName: 'Jacob', amount: 595, reason: 'no Stripe account connected' }], shortfall: [], errors: [] });
    mocks.nudgeUnpaidPayees.mockResolvedValueOnce([{ userID: 'owner-1', amount: 615 }]);

    const result = await runWeeklyPayroll({ now: MON_SEP_21 });

    expect(mocks.listPayrollCandidates).toHaveBeenCalledWith({ weekEnd: lastClosedWeekStart(MON_SEP_21) });
    expect(mocks.finalizePayrollBatch).toHaveBeenCalledTimes(2);
    expect(mocks.markPayrollBatchPaid).not.toHaveBeenCalled();
    expect(result.finalized.map((b) => b.amount)).toEqual([20, 595]);
    expect(result.toPay).toHaveLength(2); // waiting on Stripe setup
    expect(result.nudged).toEqual([{ userID: 'owner-1', amount: 615 }]);
    const call = mocks.notifyAllAdmins.mock.calls[0][0];
    expect(call.title).toMatch(/waiting on Stripe setup/);
    expect(call.message).toMatch(/Jacob \(\$615\.00\)/);
    expect(call.channels).toEqual(['inApp']);
  });

  it('a connected payee is paid by transfer and the digest says so quietly', async () => {
    mocks.getOwnerOperatorUserIDs.mockResolvedValue([]);
    mocks.listPayrollCandidates.mockResolvedValue([{ userID: 'artisan-9', userName: 'Michelle', weekStart: new Date('2026-09-14T00:00:00Z') }]);
    mocks.createPayrollBatch.mockResolvedValue({ batchID: 'b9', laborPay: 240, salePay: 35, laborHours: 4.8 });
    mocks.runConnectPayouts.mockResolvedValueOnce({ paid: [{ batchID: 'b9', userName: 'Michelle', amount: 275, transferId: 'tr_1' }], skipped: [], shortfall: [], errors: [] });

    const result = await runWeeklyPayroll({ now: MON_SEP_21 });
    expect(result.toPay).toEqual([]);
    const call = mocks.notifyAllAdmins.mock.calls[0][0];
    expect(call.title).toMatch(/\$275\.00 paid by Stripe/);
    expect(call.priority).toBe('low');
  });

  it('a short Stripe balance is loud: high priority, email + push', async () => {
    mocks.getOwnerOperatorUserIDs.mockResolvedValue([]);
    mocks.listPayrollCandidates.mockResolvedValue([{ userID: 'a', userName: 'A', weekStart: new Date('2026-09-14T00:00:00Z') }]);
    mocks.createPayrollBatch.mockResolvedValue({ batchID: 'b3', laborPay: 900, salePay: 0, laborHours: 18 });
    mocks.runConnectPayouts.mockResolvedValueOnce({ paid: [], skipped: [], shortfall: [{ batchID: 'b3', amount: 900, available: 120, reason: 'insufficient balance' }], errors: [] });

    await runWeeklyPayroll({ now: MON_SEP_21 });
    const call = mocks.notifyAllAdmins.mock.calls[0][0];
    expect(call.priority).toBe('high');
    expect(call.channels).toContain('email');
    expect(call.message).toMatch(/balance was short for \$900\.00/);
  });

  it('is idempotent: an existing open batch is skipped, other failures are reported, nothing throws', async () => {
    mocks.getOwnerOperatorUserIDs.mockResolvedValue([]);
    mocks.listPayrollCandidates.mockResolvedValue([
      { userID: 'a', userName: 'A', weekStart: new Date('2026-09-14T00:00:00Z') },
      { userID: 'b', userName: 'B', weekStart: new Date('2026-09-14T00:00:00Z') },
    ]);
    mocks.createPayrollBatch
      .mockRejectedValueOnce(new Error('A payroll batch already exists for A on week of 9/14/2026.'))
      .mockRejectedValueOnce(new Error('mongo down'));

    const result = await runWeeklyPayroll({ now: MON_SEP_21 });
    expect(result.skipped).toEqual([expect.objectContaining({ userID: 'a', reason: 'open batch exists' })]);
    expect(result.errors).toEqual([expect.objectContaining({ userID: 'b', error: 'mongo down' })]);
    expect(mocks.notifyAllAdmins.mock.calls[0][0].message).toMatch(/1 batch failed/);
  });

  it('stays silent when there is nothing at all to do', async () => {
    mocks.getOwnerOperatorUserIDs.mockResolvedValue([]);
    mocks.listPayrollCandidates.mockResolvedValue([]);
    await runWeeklyPayroll({ now: MON_SEP_21 });
    expect(mocks.notifyAllAdmins).not.toHaveBeenCalled();
  });
});
