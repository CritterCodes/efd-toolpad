import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Auto-invoicing at QC pass — the properties that protect the bill:
 *   - the atomic claim decides; a lost claim means someone else is billing (no double invoice)
 *   - an invoicing failure releases the claim ONLY when no invoice document exists
 *   - the function never throws into a QC pass (a failed invoice = repair stays COMPLETED,
 *     which is the closeout-tab fallback, not a lost bill)
 */

const mocks = vi.hoisted(() => ({
  claimForAutoInvoice: vi.fn(),
  releaseAutoInvoiceClaim: vi.fn(async () => {}),
  invoicesFindAll: vi.fn(async () => []),
  createRepairInvoice: vi.fn(),
}));

vi.mock('@/app/api/repairs/model', () => ({
  default: {
    claimForAutoInvoice: mocks.claimForAutoInvoice,
    releaseAutoInvoiceClaim: mocks.releaseAutoInvoiceClaim,
  },
}));
vi.mock('@/app/api/repair-invoices/model', () => ({
  default: { findAll: mocks.invoicesFindAll },
}));
vi.mock('@/app/api/repair-invoices/service', () => ({
  createRepairInvoice: mocks.createRepairInvoice,
}));

const { autoInvoiceAtQcPass, releaseClaimIfUninvoiced } = await import('./autoInvoice');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.claimForAutoInvoice.mockResolvedValue(true);
  mocks.invoicesFindAll.mockResolvedValue([]);
  mocks.createRepairInvoice.mockResolvedValue({ invoiceID: 'rinv-9', status: 'draft', repairIDs: ['r1', 'r2'] });
});

describe('autoInvoiceAtQcPass', () => {
  it('invoices the repair with append semantics when it wins the claim', async () => {
    const result = await autoInvoiceAtQcPass({ repairID: 'r1', deliveryMethod: 'pickup', createdBy: 'QC User' });
    expect(result).toMatchObject({ invoiced: true, invoiceID: 'rinv-9', repairCount: 2 });
    expect(mocks.createRepairInvoice).toHaveBeenCalledWith({
      repairIDs: ['r1'], deliveryMethod: 'pickup', createdBy: 'QC User', appendToOpen: true,
    });
  });

  it('a lost claim means someone else is billing — no second invoice, no throw', async () => {
    mocks.claimForAutoInvoice.mockResolvedValue(false);
    const result = await autoInvoiceAtQcPass({ repairID: 'r1' });
    expect(result.invoiced).toBe(false);
    expect(mocks.createRepairInvoice).not.toHaveBeenCalled();
  });

  it('an invoicing failure releases the claim so the closeout fallback can bill it', async () => {
    mocks.createRepairInvoice.mockRejectedValue(new Error('boom'));
    const result = await autoInvoiceAtQcPass({ repairID: 'r1' });
    expect(result.invoiced).toBe(false);
    expect(result.reason).toContain('boom');
    expect(mocks.releaseAutoInvoiceClaim).toHaveBeenCalledWith('r1');
  });

  it('does NOT release when an invoice document already exists (a release would allow a duplicate bill)', async () => {
    mocks.createRepairInvoice.mockRejectedValue(new Error('late failure'));
    mocks.invoicesFindAll.mockResolvedValue([{ invoiceID: 'rinv-existing' }]);
    const result = await autoInvoiceAtQcPass({ repairID: 'r1' });
    expect(result.invoiced).toBe(false);
    expect(result.reason).toContain('already exists');
    expect(mocks.releaseAutoInvoiceClaim).not.toHaveBeenCalled();
  });

  it('never throws into the QC pass, even when the claim itself errors', async () => {
    mocks.claimForAutoInvoice.mockRejectedValue(new Error('db down'));
    const result = await autoInvoiceAtQcPass({ repairID: 'r1' });
    expect(result.invoiced).toBe(false);
  });
});

describe('releaseClaimIfUninvoiced', () => {
  it('fails CLOSED: keeps the claim when the invoices collection cannot be read', async () => {
    mocks.invoicesFindAll.mockRejectedValue(new Error('unreachable'));
    expect(await releaseClaimIfUninvoiced('r1')).toBe(true);
    expect(mocks.releaseAutoInvoiceClaim).not.toHaveBeenCalled();
  });
});
