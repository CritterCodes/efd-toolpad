import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listPayrollCandidates: vi.fn(),
  createPayrollBatch: vi.fn(),
  finalizePayrollBatch: vi.fn(),
  markPayrollBatchPaid: vi.fn(),
  getOwnerOperatorUserIDs: vi.fn(),
  notifyAllAdmins: vi.fn(),
  isAutoPayReady: vi.fn(async () => false),
  runConnectPayouts: vi.fn(async () => ({ paid: [], skipped: [], shortfall: [], errors: [] })),
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
vi.mock('@/services/payroll/connectPayouts', () => ({ isAutoPayReady: mocks.isAutoPayReady, runConnectPayouts: mocks.runConnectPayouts }));

import { runWeeklyPayroll, lastClosedWeekStart, OWNER_LEDGER_METHOD } from './autoPayroll';

const MON_SEP_21 = new Date('2026-09-21T11:00:00Z'); // the cron fires Monday morning

describe('weekly payroll run', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.finalizePayrollBatch.mockResolvedValue({});
    mocks.markPayrollBatchPaid.mockResolvedValue({});
    mocks.notifyAllAdmins.mockResolvedValue({});
  });

  it('closes weeks strictly before the current Monday', () => {
    const cutoff = lastClosedWeekStart(MON_SEP_21);
    expect(cutoff.toISOString().slice(0, 10)).toBe('2026-09-14');
    // Wednesday still resolves to last week's Monday
    expect(lastClosedWeekStart(new Date('2026-09-23T15:00:00Z')).toISOString().slice(0, 10)).toBe('2026-09-14');
  });

  it("settles the owner-operator's weeks to the ledger (no payout notification) and sweeps missed weeks", async () => {
    mocks.getOwnerOperatorUserIDs.mockResolvedValue(['owner-1']);
    mocks.listPayrollCandidates.mockResolvedValue([
      { userID: 'owner-1', userName: 'Jacob', weekStart: new Date('2026-09-07T00:00:00Z') },
      { userID: 'owner-1', userName: 'Jacob', weekStart: new Date('2026-09-14T00:00:00Z') },
    ]);
    mocks.createPayrollBatch
      .mockResolvedValueOnce({ batchID: 'b1', laborPay: 20, salePay: 0, laborHours: 0.4 })
      .mockResolvedValueOnce({ batchID: 'b2', laborPay: 595, salePay: 0, laborHours: 11.9 });

    const result = await runWeeklyPayroll({ now: MON_SEP_21 });

    expect(mocks.listPayrollCandidates).toHaveBeenCalledWith({ weekEnd: lastClosedWeekStart(MON_SEP_21) });
    expect(mocks.createPayrollBatch).toHaveBeenCalledTimes(2);
    expect(mocks.finalizePayrollBatch).toHaveBeenCalledWith('b1');
    expect(mocks.markPayrollBatchPaid).toHaveBeenCalledWith('b2', expect.objectContaining({ paymentMethod: OWNER_LEDGER_METHOD, notify: false }));
    expect(result.ownerLedger.map((b) => b.amount)).toEqual([20, 595]);
    expect(result.toPay).toEqual([]);
    // quiet in-app digest only — nothing to pay
    const call = mocks.notifyAllAdmins.mock.calls[0][0];
    expect(call.type).toBe('payroll-ran');
    expect(call.channels).toEqual(['inApp']);
    expect(call.message).toMatch(/\$615\.00/);
  });

  it('leaves a non-owner batch finalized and alerts admins loudly', async () => {
    mocks.getOwnerOperatorUserIDs.mockResolvedValue(['owner-1']);
    mocks.listPayrollCandidates.mockResolvedValue([
      { userID: 'artisan-9', userName: 'Michelle', weekStart: new Date('2026-09-14T00:00:00Z') },
    ]);
    mocks.createPayrollBatch.mockResolvedValue({ batchID: 'b9', laborPay: 240, salePay: 35, laborHours: 4.8 });

    const result = await runWeeklyPayroll({ now: MON_SEP_21 });

    expect(mocks.markPayrollBatchPaid).not.toHaveBeenCalled();
    expect(result.toPay).toEqual([expect.objectContaining({ batchID: 'b9', amount: 275 })]);
    const call = mocks.notifyAllAdmins.mock.calls[0][0];
    expect(call.type).toBe('payroll-ready');
    expect(call.priority).toBe('high');
    expect(call.title).toMatch(/\$275\.00/);
    expect(call.message).toMatch(/Michelle/);
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

  it("an owner on Stripe auto-pay is left finalized for the transfer instead of ledgered, and the transfer is reported", async () => {
    mocks.getOwnerOperatorUserIDs.mockResolvedValue(['owner-1']);
    mocks.isAutoPayReady.mockResolvedValueOnce(true);
    mocks.listPayrollCandidates.mockResolvedValue([{ userID: 'owner-1', userName: 'Jacob', weekStart: new Date('2026-09-14T00:00:00Z') }]);
    mocks.createPayrollBatch.mockResolvedValue({ batchID: 'b7', laborPay: 500, salePay: 0, laborHours: 10 });
    mocks.runConnectPayouts.mockResolvedValueOnce({ paid: [{ batchID: 'b7', userName: 'Jacob', amount: 500, transferId: 'tr_1' }], skipped: [], shortfall: [], errors: [] });

    const result = await runWeeklyPayroll({ now: MON_SEP_21 });
    expect(mocks.markPayrollBatchPaid).not.toHaveBeenCalled(); // the payout module marks it paid after the transfer
    expect(result.ownerLedger).toEqual([]);
    expect(result.toPay).toEqual([]); // paid by Stripe, so nothing left "to pay"
    const call = mocks.notifyAllAdmins.mock.calls[0][0];
    expect(call.title).toMatch(/\$500\.00 paid by Stripe/);
  });

  it('stays silent when there is nothing at all to do', async () => {
    mocks.getOwnerOperatorUserIDs.mockResolvedValue([]);
    mocks.listPayrollCandidates.mockResolvedValue([]);
    await runWeeklyPayroll({ now: MON_SEP_21 });
    expect(mocks.notifyAllAdmins).not.toHaveBeenCalled();
  });
});
