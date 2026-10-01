import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * EFD-DEFECTS P3: a transfer that went out but was never recorded (markPayrollBatchPaid threw) left the batch
 * FINALIZED, and once the ~24 h idempotency window passed the next daily run paid it again. Stripe is the
 * record: a live transfer in the batch's group is the payment.
 */
const { findByBatchID, markPayrollBatchPaid, createTransfer, listTransfersByGroup } = vi.hoisted(() => ({
  findByBatchID: vi.fn(),
  markPayrollBatchPaid: vi.fn(async () => ({})),
  createTransfer: vi.fn(async () => ({ id: 'tr_new', amount: 25000 })),
  listTransfersByGroup: vi.fn(),
}));

vi.mock('@/lib/database', () => ({
  db: { connect: vi.fn(async () => ({ collection: () => ({ findOne: async () => USER }) })) },
}));
vi.mock('@/app/api/repairPayrollBatches/model', () => ({ default: { findByBatchID, list: vi.fn() } }));
vi.mock('@/app/api/repairs/payroll/service', () => ({ markPayrollBatchPaid }));
vi.mock('@/lib/notificationService', () => ({ notifyAllAdmins: vi.fn(async () => ({})) }));
vi.mock('@/lib/appUrls', () => ({ adminBase: () => 'http://test' }));
vi.mock('@/lib/stripeConnect', async (importOriginal) => ({
  ...(await importOriginal()),
  retrieveAccount: vi.fn(async () => ({ id: 'acct_1', details_submitted: true, payouts_enabled: true, capabilities: { transfers: 'active' } })),
  retrieveBalance: vi.fn(async () => ({ available: [{ currency: 'usd', amount: 1_000_000 }] })),
  createTransfer,
  listTransfersByGroup,
}));

const USER = {
  userID: 'u-1',
  stripeConnect: { accountId: 'acct_1', detailsSubmitted: true, payoutsEnabled: true, transfersActive: true },
};
const BATCH = { batchID: 'rpay-1', userID: 'u-1', userName: 'Jeweler', status: 'finalized', laborPay: 250, totalPay: 250, weekStart: '2026-09-27T00:00:00Z', cadence: 'weekly' };

const { payBatchViaConnect } = await import('./connectPayouts');

describe('a payroll batch is never paid twice', () => {
  beforeEach(() => {
    findByBatchID.mockReset().mockResolvedValue({ ...BATCH });
    markPayrollBatchPaid.mockClear();
    createTransfer.mockClear();
    listTransfersByGroup.mockReset();
  });

  it('records an earlier, unrecorded transfer instead of sending another', async () => {
    listTransfersByGroup.mockResolvedValue({ data: [{ id: 'tr_old', amount: 25000, amount_reversed: 0, reversed: false, created: 1759000000 }] });
    const r = await payBatchViaConnect({ batchID: 'rpay-1', availableCents: 1_000_000 });
    expect(createTransfer).not.toHaveBeenCalled();
    expect(r).toMatchObject({ paid: true, recordedExisting: true, transferId: 'tr_old', amountCents: 0 });
    expect(markPayrollBatchPaid).toHaveBeenCalledWith('rpay-1', expect.objectContaining({ paymentReference: 'tr_old' }));
  });

  it('pays normally when Stripe has no transfer for the batch', async () => {
    listTransfersByGroup.mockResolvedValue({ data: [] });
    const r = await payBatchViaConnect({ batchID: 'rpay-1', availableCents: 1_000_000 });
    expect(createTransfer).toHaveBeenCalledTimes(1);
    expect(createTransfer.mock.calls[0][0]).toMatchObject({ transferGroup: 'rpay-1', idempotencyKey: 'payroll-rpay-1' });
    expect(r).toMatchObject({ paid: true, transferId: 'tr_new' });
  });

  it('stops for a person when only a reversed transfer exists', async () => {
    listTransfersByGroup.mockResolvedValue({ data: [{ id: 'tr_rev', amount: 25000, amount_reversed: 25000, reversed: true }] });
    const r = await payBatchViaConnect({ batchID: 'rpay-1', availableCents: 1_000_000 });
    expect(createTransfer).not.toHaveBeenCalled();
    expect(markPayrollBatchPaid).not.toHaveBeenCalled();
    expect(r.paid).toBe(false);
    expect(r.reason).toMatch(/reversed transfer/);
  });

  it("doesn't pay when Stripe can't say whether it already did", async () => {
    listTransfersByGroup.mockRejectedValue(new Error('Stripe unavailable'));
    await expect(payBatchViaConnect({ batchID: 'rpay-1', availableCents: 1_000_000 })).rejects.toThrow('Stripe unavailable');
    expect(createTransfer).not.toHaveBeenCalled();
  });
});
