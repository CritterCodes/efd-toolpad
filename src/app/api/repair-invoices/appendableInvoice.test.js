import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * WHICH INVOICE A FINISHED REPAIR JOINS (owner, 2026-09-29: "when I click Finalize, that's whenever
 * it's finalized, and it goes to Open, and they get notified that they need to pay").
 *
 * Only that account's DRAFT, whoever the customer is. Finalize issues the bill and tells the
 * customer, so nothing may join afterwards — a total that grows after somebody has been shown it is
 * the thing this prevents. Six rings dropped off together still land on one invoice because all six
 * arrive while it is a draft; so does a store's week.
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

/** The status the append lookup searched for. */
const statusFilter = () => mocks.invoiceFindOne.mock.calls[0][0].status;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.invoiceFindOne.mockResolvedValue(null);
});

describe('which invoice a finished repair joins', () => {
  it('a retail repair may only join a DRAFT', async () => {
    mocks.findById.mockResolvedValue(retail());
    await createRepairInvoice({ repairIDs: ['R-1'], createdBy: 'qc' });

    expect(statusFilter()).toBe('draft');
    // Nothing to join → a new invoice, which is what a late repair should get.
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft' }));
  });

  it('so a repair finished after Finalize starts its own invoice instead of reopening the bill', async () => {
    mocks.findById.mockResolvedValue(retail());
    // The customer's earlier invoice is finalized, so the draft lookup finds nothing.
    mocks.invoiceFindOne.mockImplementation(async (query) => (
      query.status === 'draft' ? null : { invoiceID: 'rinv-finalized', status: 'open' }
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

  it('a store works the same way — its week collects on one draft until someone finalizes it', async () => {
    mocks.findById.mockResolvedValue(wholesale());
    mocks.invoiceFindOne.mockResolvedValue({
      invoiceID: 'rinv-marlen', status: 'draft', repairIDs: ['R-0'], repairSnapshots: [], amountPaid: 0,
    });

    await createRepairInvoice({ repairIDs: ['R-2'], createdBy: 'qc' });

    expect(statusFilter()).toBe('draft');
    expect(mocks.updateByInvoiceID).toHaveBeenCalledWith('rinv-marlen', expect.objectContaining({
      repairIDs: ['R-0', 'R-2'],
    }));
  });

  it('never joins an invoice that is already paid, whoever it belongs to', async () => {
    mocks.findById.mockResolvedValue(retail());
    await createRepairInvoice({ repairIDs: ['R-1'], createdBy: 'qc' });
    expect(mocks.invoiceFindOne.mock.calls[0][0].paymentStatus).toEqual({ $ne: 'paid' });
  });
});
