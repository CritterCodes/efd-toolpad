import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * WHICH INVOICE A FINISHED REPAIR JOINS (owner, 2026-09-29: "only append to drafts, late repairs
 * should start a new invoice").
 *
 * Finalize is what tells a retail customer their work is ready and what they owe. Appending to an
 * invoice that has already been finalized quietly grows a bill they have been shown — so retail
 * repairs may only join a DRAFT. Six rings dropped off together still land on one invoice, because
 * all six arrive while it is a draft.
 *
 * Wholesale still joins an open invoice on purpose: a store's invoice is auto-finalized the moment
 * its first repair passes QC, so drafts-only would bill a store once per repair — and ship a box
 * each time.
 */
const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  invoiceFindOne: vi.fn(async () => null),
  create: vi.fn(async (doc) => ({ ...doc, invoiceID: 'rinv-new' })),
  updateByInvoiceID: vi.fn(async (invoiceID, update) => ({ invoiceID, ...update })),
  repairUpdateById: vi.fn(async () => ({})),
}));

vi.mock('@/lib/database', () => ({
  db: { connect: async () => ({ collection: () => ({ findOne: mocks.invoiceFindOne }) }) },
}));
vi.mock('@/app/api/repairs/model', () => ({
  default: { findById: mocks.findById, updateById: mocks.repairUpdateById },
}));
vi.mock('@/app/api/repair-invoices/model', () => ({
  default: {
    COLLECTION: 'repairInvoices',
    create: mocks.create,
    updateByInvoiceID: mocks.updateByInvoiceID,
    findByInvoiceID: vi.fn(async () => null),
  },
}));

const { createRepairInvoice } = await import('./service');

const retail = (over = {}) => ({
  repairID: 'R-1', status: 'COMPLETED', userID: 'user-1', clientName: 'Caroline Sullivan',
  isWholesale: false, tasks: [], materials: [], customLineItems: [], totalCost: 60, ...over,
});
const wholesale = (over = {}) => retail({
  repairID: 'R-2', isWholesale: true, businessName: 'Marlen Jewelers', storeId: 'ws-marlen', ...over,
});

/** The status filter the append lookup ran with. */
const statusFilter = () => mocks.invoiceFindOne.mock.calls[0][0].status.$in;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.invoiceFindOne.mockResolvedValue(null);
});

describe('which invoice a finished repair joins', () => {
  it('a retail repair may only join a DRAFT', async () => {
    mocks.findById.mockResolvedValue(retail());
    await createRepairInvoice({ repairIDs: ['R-1'], createdBy: 'qc' });

    expect(statusFilter()).toEqual(['draft']);
    // Nothing to join → a new invoice, which is what a late repair should get.
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }));
  });

  it('so a repair finished after Finalize starts its own invoice instead of reopening the bill', async () => {
    mocks.findById.mockResolvedValue(retail());
    // The customer's earlier invoice, already finalized and already notified.
    mocks.invoiceFindOne.mockImplementation(async (query) => (
      query.status.$in.includes('open')
        ? { invoiceID: 'rinv-finalized', status: 'open', repairIDs: ['R-0'], repairSnapshots: [] }
        : null
    ));

    const invoice = await createRepairInvoice({ repairIDs: ['R-1'], createdBy: 'qc' });

    expect(invoice.invoiceID).toBe('rinv-new');
    expect(mocks.updateByInvoiceID).not.toHaveBeenCalledWith('rinv-finalized', expect.anything());
  });

  it('but six rings dropped off together still land on ONE invoice', async () => {
    mocks.findById.mockResolvedValue(retail());
    mocks.invoiceFindOne.mockResolvedValue({
      invoiceID: 'rinv-draft', status: 'draft', repairIDs: ['R-0'], repairSnapshots: [], amountPaid: 0,
    });

    await createRepairInvoice({ repairIDs: ['R-1'], createdBy: 'qc' });

    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.updateByInvoiceID).toHaveBeenCalledWith('rinv-draft', expect.objectContaining({
      repairIDs: ['R-0', 'R-1'],
    }));
  });

  it('a wholesale repair still joins an open one — the store is billed per day, not per repair', async () => {
    mocks.findById.mockResolvedValue(wholesale());
    await createRepairInvoice({ repairIDs: ['R-2'], createdBy: 'qc' });

    expect(statusFilter()).toEqual(['draft', 'open']);
  });

  it('never joins an invoice that is already paid, whoever it belongs to', async () => {
    mocks.findById.mockResolvedValue(retail());
    await createRepairInvoice({ repairIDs: ['R-1'], createdBy: 'qc' });
    expect(mocks.invoiceFindOne.mock.calls[0][0].paymentStatus).toEqual({ $ne: 'paid' });
  });
});
