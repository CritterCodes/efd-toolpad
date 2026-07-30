import { db } from '@/lib/database';
import CastingBatchesModel from '@/app/api/castingBatches/model';
import ArtisanInvoicesModel, { ARTISAN_INVOICE_STATUS } from '@/app/api/artisanInvoices/model';
import { billCastingBatch } from '@/services/production/artisanBilling';

/**
 * Casting ⇄ artisan-invoice settlement (U-BILL-1).
 *
 * A casting batch and its debt are two records, and they must never disagree. THE INVARIANT:
 * **every exit from an invoiced state must resolve the invoice** — paid on payment, void on
 * cancellation. `listOverdue` only ignores non-`pending_payment` rows, so an abandoned pending row
 * silently freezes the artisan (blocking mintRun / requestDesignCad / casting-create) with no
 * in-product way to clear it. Getting this wrong is worse than never billing at all.
 *
 * Lives here rather than in the route so the wiring is unit-testable, and rather than in
 * `castingBoard` because `artisanBilling` already imports that module (cycle).
 *
 * Every function is NON-THROWING: by the time they run the primary transition has committed, so a
 * bookkeeping failure must be reported, never allowed to 500 or appear to undo the transition.
 */

/** Bill a just-received casting to its owning artisan, and link the invoice back onto the batch. */
export async function billReceivedCasting({ batchId, ownerId, createdBy = null }) {
  try {
    // Resolve the billing email so the invoice can be pushed to Stripe later; missing is not fatal.
    let billedEmail = null;
    if (ownerId) {
      const dbInstance = await db.connect();
      const user = await dbInstance.collection('users').findOne({ userID: ownerId }, { projection: { _id: 0, email: 1 } });
      billedEmail = user?.email || null;
    }
    const invoice = await billCastingBatch({ batchId, billedEmail, createdBy });
    // Null = deliberately not billable: no charge yet, or the run is EFD's own (EFD doesn't bill EFD).
    if (!invoice) return { invoiced: false, reason: 'nothing to bill on this batch (no charge, or it is EFD’s own run)' };
    // Dotted $set — never overwrite the whole `charge` subdocument, which would clobber a concurrent
    // paid/paidAt write and silently reopen a settled charge.
    await CastingBatchesModel.updateById(batchId, { 'charge.invoiceID': invoice.invoiceID }).catch(() => {});
    return { invoiced: true, invoiceID: invoice.invoiceID, amount: invoice.amount, billedEmail: invoice.billedEmail };
  } catch (e) {
    console.error('[casting] receipt billing failed:', e?.message || e);
    return {
      invoiced: false,
      error: true,
      reason: `The casting was received, but creating its invoice failed: ${e?.message || e}. It stays gated from shipping, and marking it paid will still release it.`,
    };
  }
}

/** Mark the batch's invoice PAID. Counterpart to markCastingPaid, which only clears the ship gate. */
export async function settleCastingInvoice({ batchId }) {
  try {
    const invoice = await ArtisanInvoicesModel.findOneBySource('casting_batch', batchId);
    if (!invoice) return { settled: false, reason: 'no invoice on this batch (nothing to settle)' };
    if (invoice.status === ARTISAN_INVOICE_STATUS.PAID) return { settled: true, invoiceID: invoice.invoiceID, alreadyPaid: true };
    await ArtisanInvoicesModel.markPaid(invoice.invoiceID);
    return { settled: true, invoiceID: invoice.invoiceID };
  } catch (e) {
    console.error('[casting] invoice settlement failed:', e?.message || e);
    return {
      settled: false,
      error: true,
      reason: `Payment was recorded and the casting released, but its invoice could not be marked paid: ${e?.message || e}. It must be settled or voided, or the artisan will be frozen when it goes overdue.`,
    };
  }
}

/**
 * VOID the batch's invoice because the casting was cancelled. Without this, cancelling a received
 * (already-invoiced) batch strands a `pending_payment` debt that freezes the artisan ~2 weeks later
 * for a casting EFD wrote off — with no surface to clear it. An already-PAID invoice is left alone
 * (a refund is a separate, deliberate act, not a side effect of cancelling).
 */
export async function voidCastingInvoice({ batchId, reason = 'casting cancelled' }) {
  try {
    const invoice = await ArtisanInvoicesModel.findOneBySource('casting_batch', batchId);
    if (!invoice) return { voided: false, reason: 'no invoice on this batch (nothing to void)' };
    if (invoice.status === ARTISAN_INVOICE_STATUS.PAID) {
      return { voided: false, alreadyPaid: true, reason: 'this casting was already paid for — cancelling does not refund it; issue a refund deliberately' };
    }
    if (invoice.status === ARTISAN_INVOICE_STATUS.VOID) return { voided: true, invoiceID: invoice.invoiceID, alreadyVoid: true };
    await ArtisanInvoicesModel.markVoid(invoice.invoiceID, reason);
    return { voided: true, invoiceID: invoice.invoiceID };
  } catch (e) {
    console.error('[casting] invoice void failed:', e?.message || e);
    return {
      voided: false,
      error: true,
      reason: `The casting was cancelled, but its invoice could not be voided: ${e?.message || e}. Void it manually or the artisan will be frozen for a written-off casting.`,
    };
  }
}
