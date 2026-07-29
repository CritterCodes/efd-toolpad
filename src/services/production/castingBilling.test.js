import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * Coverage for CASTING RECEIPT → ARTISAN INVOICE (U-BILL-1).
 *
 * This is the call that puts casting debt on the `artisanInvoices` rail. Before it existed, the
 * charge minted at receipt lived only on the batch, so `isArtisanFrozen` — which reads
 * artisanInvoices — could never fire for a casting, and the nothing-is-fronted ship gate was a staff
 * click and nothing more.
 *
 * The two money properties pinned here:
 *  1. the invoice bills the MARKED-UP charge, never the raw vendor cost (billing the raw cost would
 *     silently hand EFD's infra fee back to the artisan), and
 *  2. it can never double-bill.
 */

const state = { batch: null, invoices: [], created: [] };

vi.mock('@/app/api/castingBatches/model', () => ({
  default: { findById: async () => state.batch },
  CASTING_STATUS: { NEEDS_ORDERING: 'needs_ordering', ORDERED: 'ordered', RECEIVED: 'received', DELIVERED: 'delivered', DISPUTED: 'disputed', ACCEPTED: 'accepted', CANCELLED: 'cancelled' },
}));
vi.mock('@/app/api/artisanInvoices/model', () => ({
  default: {
    findOneBySource: async (sourceType, sourceID) => state.invoices.find((i) => i.sourceType === sourceType && i.sourceID === sourceID) || null,
    create: async (data) => {
      const inv = { invoiceID: `ainv-${state.invoices.length + 1}`, status: 'pending_payment', ...data };
      state.invoices.push(inv); state.created.push(inv);
      return inv;
    },
    listOverdue: async () => [],
  },
  ARTISAN_INVOICE_KIND: { WORK_ORDER: 'artisan_wo_invoice', CASTING: 'casting_charge' },
  ARTISAN_INVOICE_STATUS: { PENDING: 'pending_payment', PAID: 'paid', VOID: 'void' },
}));
// artisanBilling imports castingBoard for markCastingPaid — stub it so this test never reaches a DB.
vi.mock('@/services/production/castingBoard', () => ({ markCastingPaid: async () => ({}) }));
vi.mock('@/services/production/workOrderPricing', () => ({
  getWorkOrderMarkupMultiplier: async () => 1.5,
  applyWorkOrderMarkup: (cost, m) => Math.round((Number(cost) || 0) * m * 100) / 100,
  DEFAULT_WO_MARKUP: 1.5,
}));

const load = async () => import('@/services/production/artisanBilling');

beforeEach(() => {
  // A received vendor batch: $200 actual vendor cost, charged at 1.5× = $300.
  state.batch = {
    batchId: 'b1', ownerId: 'artisan-1', runId: 'r1', vendor: 'Carrera',
    status: 'received', actualCost: 200,
    charge: { amount: 300, markupMultiplier: 1.5, paid: false, paidAt: null, invoiceID: null },
  };
  state.invoices = [];
  state.created = [];
});

describe('billCastingBatch', () => {
  it('bills the MARKED-UP charge, not the raw vendor cost', async () => {
    const { billCastingBatch } = await load();
    const inv = await billCastingBatch({ batchId: 'b1', billedEmail: 'a@t.test', createdBy: 'staff-9' });
    expect(inv.amount).toBe(300);            // charge.amount
    expect(inv.amount).not.toBe(200);        // NOT actualCost — that would forfeit EFD's markup
    expect(inv.breakdown).toEqual({ casting: 200, markupMultiplier: 1.5 });
  });

  it('bills the OWNING artisan and carries the run + kind + email', async () => {
    const { billCastingBatch } = await load();
    const inv = await billCastingBatch({ batchId: 'b1', billedEmail: 'a@t.test', createdBy: 'staff-9' });
    expect(inv).toMatchObject({
      kind: 'casting_charge',
      billedUserID: 'artisan-1',
      billedEmail: 'a@t.test',
      sourceType: 'casting_batch',
      sourceID: 'b1',
      runId: 'r1',
    });
    expect(inv.description).toContain('Carrera');
  });

  it('is IDEMPOTENT — billing twice never creates a second debt', async () => {
    const { billCastingBatch } = await load();
    const first = await billCastingBatch({ batchId: 'b1' });
    const second = await billCastingBatch({ batchId: 'b1' });
    expect(second.invoiceID).toBe(first.invoiceID);
    expect(state.created).toHaveLength(1);
  });

  it('creates NOTHING when the batch has no charge yet (not received)', async () => {
    state.batch = { batchId: 'b1', ownerId: 'artisan-1', status: 'ordered', charge: { amount: null } };
    const { billCastingBatch } = await load();
    expect(await billCastingBatch({ batchId: 'b1' })).toBeNull();
    expect(state.created).toHaveLength(0);
  });

  it('a $0 charge bills nothing (a comped casting creates no debt)', async () => {
    state.batch.charge = { amount: 0, markupMultiplier: 1.5, paid: false };
    const { billCastingBatch } = await load();
    expect(await billCastingBatch({ batchId: 'b1' })).toBeNull();
    expect(state.created).toHaveLength(0);
  });

  it('throws on a missing batch rather than inventing an invoice', async () => {
    state.batch = null;
    const { billCastingBatch } = await load();
    await expect(billCastingBatch({ batchId: 'nope' })).rejects.toThrow(/not found/);
    expect(state.created).toHaveLength(0);
  });

  it('a null email still produces the invoice (it can be pushed to Stripe later)', async () => {
    const { billCastingBatch } = await load();
    const inv = await billCastingBatch({ batchId: 'b1' });
    expect(inv.invoiceID).toBeTruthy();
    expect(inv.billedEmail).toBeNull();
  });
});

describe('the freeze becomes real once a casting invoice is overdue', () => {
  it('hasOverdueInvoices sees a past-due casting invoice', async () => {
    const { hasOverdueInvoices } = await load();
    const past = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    expect(hasOverdueInvoices([{ status: 'pending_payment', dueAt: past }])).toBe(true);
  });
  it('and ignores it once paid', async () => {
    const { hasOverdueInvoices } = await load();
    const past = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    expect(hasOverdueInvoices([{ status: 'paid', dueAt: past }])).toBe(false);
  });
});

