import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * U-BILL-1 wiring tests.
 *
 * THE INVARIANT UNDER TEST: every exit from an invoiced casting state resolves the invoice — PAID on
 * payment, VOID on cancellation. `listOverdue` only skips non-`pending_payment` rows, so any exit
 * that leaves the row pending silently freezes the artisan (no mintRun / requestDesignCad / casting)
 * ~2 weeks later, for a debt that is settled or written off, with nothing on the board to click.
 *
 * This file exists because the settlement wiring previously had NO coverage at all: deleting the
 * settle call passed the entire 622-test suite. Both gaps were found by reading, twice.
 */

const invoices = new Map();
const batches = new Map();

vi.mock('@/lib/database', () => ({
  db: {
    connect: async () => ({
      collection: () => ({ findOne: async () => ({ email: 'artisan@example.com' }) }),
    }),
  },
}));

vi.mock('@/app/api/castingBatches/model', () => ({
  default: {
    findById: async (batchId) => batches.get(batchId) || null,
    updateById: async (batchId, patch) => {
      const b = batches.get(batchId);
      // Mirror Mongo's dotted-path $set semantics so a whole-subdocument overwrite of `charge`
      // (which would clobber a concurrent paid/paidAt write) can't pass as if it were a field set.
      for (const [k, v] of Object.entries(patch)) {
        if (k.includes('.')) {
          const [head, tail] = k.split('.');
          b[head] = { ...b[head], [tail]: v };
        } else b[k] = v;
      }
      return b;
    },
  },
}));

vi.mock('@/app/api/artisanInvoices/model', () => ({
  ARTISAN_INVOICE_STATUS: { PENDING: 'pending_payment', PAID: 'paid', VOID: 'void' },
  default: {
    findOneBySource: async (sourceType, sourceID) =>
      [...invoices.values()].find((i) => i.sourceType === sourceType && i.sourceID === sourceID) || null,
    markPaid: async (invoiceID) => Object.assign(invoices.get(invoiceID), { status: 'paid', paidAt: new Date() }),
    markVoid: async (invoiceID, reason) => Object.assign(invoices.get(invoiceID), { status: 'void', voidedAt: new Date(), voidReason: reason }),
  },
}));

vi.mock('@/services/production/artisanBilling', () => ({
  billCastingBatch: async ({ batchId, billedEmail }) => {
    const batch = batches.get(batchId);
    if (batch?.charge?.amount == null) return null;
    const existing = [...invoices.values()].find((i) => i.sourceType === 'casting_batch' && i.sourceID === batchId);
    if (existing) return existing;
    const inv = {
      invoiceID: `ainv-${invoices.size + 1}`, sourceType: 'casting_batch', sourceID: batchId,
      billedUserID: batch.ownerId, billedEmail, amount: batch.charge.amount, status: 'pending_payment',
      dueAt: new Date(Date.now() + 14 * 86400_000),
    };
    invoices.set(inv.invoiceID, inv);
    return inv;
  },
}));

const { billReceivedCasting, settleCastingInvoice, voidCastingInvoice } = await import('@/services/production/castingSettlement');
const ArtisanInvoicesModel = (await import('@/app/api/artisanInvoices/model')).default;

/** Would `isArtisanFrozen` fire for this artisan once the due date passes? */
const wouldFreeze = (ownerId) => [...invoices.values()].some((i) => i.billedUserID === ownerId && i.status === 'pending_payment');

function seedReceivedBatch(batchId = 'cb-1', ownerId = 'u-artisan') {
  batches.set(batchId, {
    batchId, ownerId, status: 'received', actualCost: 100,
    charge: { amount: 150, markupMultiplier: 1.5, paid: false, paidAt: null, invoiceID: null },
    shippingGated: true,
  });
  return batchId;
}

beforeEach(() => { invoices.clear(); batches.clear(); });

describe('billReceivedCasting', () => {
  it('creates the invoice and links it onto the batch', async () => {
    const batchId = seedReceivedBatch();
    const res = await billReceivedCasting({ batchId, ownerId: 'u-artisan', createdBy: 'staff-1' });
    expect(res).toMatchObject({ invoiced: true, amount: 150, billedEmail: 'artisan@example.com' });
    expect(batches.get(batchId).charge.invoiceID).toBe(res.invoiceID);
    expect(wouldFreeze('u-artisan')).toBe(true);   // the debt is real — that's the point of the slice
  });

  it('links via a DOTTED path, preserving the rest of the charge subdocument', async () => {
    const batchId = seedReceivedBatch();
    // Simulate a concurrent markCastingPaid landing before the write-back.
    batches.get(batchId).charge.paid = true;
    await billReceivedCasting({ batchId, ownerId: 'u-artisan' });
    const { charge } = batches.get(batchId);
    expect(charge.paid).toBe(true);                 // NOT clobbered back to false
    expect(charge.amount).toBe(150);
    expect(charge.markupMultiplier).toBe(1.5);
  });

  it('degrades without throwing when there is no charge to bill', async () => {
    batches.set('cb-x', { batchId: 'cb-x', ownerId: 'u-artisan', charge: { amount: null } });
    await expect(billReceivedCasting({ batchId: 'cb-x', ownerId: 'u-artisan' })).resolves.toMatchObject({ invoiced: false });
  });

  it('never throws when the invoice write fails — the receipt already committed', async () => {
    const batchId = seedReceivedBatch();
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const billing = await import('@/services/production/artisanBilling');
    const orig = billing.billCastingBatch;
    billing.billCastingBatch = async () => { throw new Error('mongo down'); };
    try {
      const res = await billReceivedCasting({ batchId, ownerId: 'u-artisan' });
      expect(res.invoiced).toBe(false);
      expect(res.error).toBe(true);       // structured flag — the UI must not sniff prose
      expect(res.reason).toContain('mongo down');
    } finally { billing.billCastingBatch = orig; spy.mockRestore(); }
  });
});

describe('settleCastingInvoice — payment must clear the debt, not just the ship gate', () => {
  it('marks the invoice PAID so the artisan is not frozen later', async () => {
    const batchId = seedReceivedBatch();
    await billReceivedCasting({ batchId, ownerId: 'u-artisan' });
    expect(wouldFreeze('u-artisan')).toBe(true);

    const res = await settleCastingInvoice({ batchId });
    expect(res.settled).toBe(true);
    expect((await ArtisanInvoicesModel.findOneBySource('casting_batch', batchId)).status).toBe('paid');
    // THE REGRESSION GUARD: paying must remove the freeze signal.
    expect(wouldFreeze('u-artisan')).toBe(false);
  });

  it('is idempotent on a double-click', async () => {
    const batchId = seedReceivedBatch();
    await billReceivedCasting({ batchId, ownerId: 'u-artisan' });
    await settleCastingInvoice({ batchId });
    await expect(settleCastingInvoice({ batchId })).resolves.toMatchObject({ settled: true, alreadyPaid: true });
  });

  it('degrades cleanly on a batch with no invoice (billed before this slice)', async () => {
    const batchId = seedReceivedBatch();
    const res = await settleCastingInvoice({ batchId });
    expect(res).toMatchObject({ settled: false });
    expect(res.error).toBeUndefined();   // absent invoice is not an error
  });

  it('finds the invoice by SOURCE, not by charge.invoiceID (survives a lost write-back)', async () => {
    const batchId = seedReceivedBatch();
    await billReceivedCasting({ batchId, ownerId: 'u-artisan' });
    batches.get(batchId).charge.invoiceID = null;    // write-back was swallowed
    await expect(settleCastingInvoice({ batchId })).resolves.toMatchObject({ settled: true });
    expect(wouldFreeze('u-artisan')).toBe(false);
  });
});

describe('voidCastingInvoice — cancelling must write off the debt', () => {
  it('VOIDs the invoice so a cancelled casting cannot freeze the artisan', async () => {
    const batchId = seedReceivedBatch();
    await billReceivedCasting({ batchId, ownerId: 'u-artisan' });
    expect(wouldFreeze('u-artisan')).toBe(true);

    const res = await voidCastingInvoice({ batchId, reason: 'vendor never delivered' });
    expect(res.voided).toBe(true);
    const inv = await ArtisanInvoicesModel.findOneBySource('casting_batch', batchId);
    expect(inv.status).toBe('void');
    expect(inv.voidReason).toBe('vendor never delivered');
    // THE BLOCKER: before this existed, cancel left the row pending and froze the artisan for a
    // casting EFD wrote off — with no markVoid, no invoice route, and no admin UI to clear it.
    expect(wouldFreeze('u-artisan')).toBe(false);
  });

  it('refuses to void an ALREADY PAID casting — a refund is a deliberate act, not a side effect', async () => {
    const batchId = seedReceivedBatch();
    await billReceivedCasting({ batchId, ownerId: 'u-artisan' });
    await settleCastingInvoice({ batchId });
    const res = await voidCastingInvoice({ batchId });
    expect(res).toMatchObject({ voided: false, alreadyPaid: true });
    expect((await ArtisanInvoicesModel.findOneBySource('casting_batch', batchId)).status).toBe('paid');
  });

  it('is idempotent, and degrades cleanly with no invoice', async () => {
    const batchId = seedReceivedBatch();
    await billReceivedCasting({ batchId, ownerId: 'u-artisan' });
    await voidCastingInvoice({ batchId });
    await expect(voidCastingInvoice({ batchId })).resolves.toMatchObject({ voided: true, alreadyVoid: true });

    batches.set('cb-2', { batchId: 'cb-2', ownerId: 'u-b', charge: { amount: null } });
    const res = await voidCastingInvoice({ batchId: 'cb-2' });
    expect(res).toMatchObject({ voided: false });
    expect(res.error).toBeUndefined();
  });
});
