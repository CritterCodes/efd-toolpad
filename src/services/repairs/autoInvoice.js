import RepairsModel from '@/app/api/repairs/model';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { createRepairInvoice } from '@/app/api/repair-invoices/service';

/**
 * Repairs land on an invoice the moment QC passes them (owner, 2026-09-04: "there's a step
 * where we have to go and move items to the invoice and it just feels like an extra step now
 * that we aren't doing pictures anymore"). The manual closeout batch on Payment & Pickup is
 * now the FALLBACK for stragglers, not the daily flow.
 *
 * The dedupe machinery is the same atomic claim the closeout-confirm route has used all along
 * (claimForAutoInvoice / releaseClaimIfUninvoiced) — two surfaces invoicing the same repair
 * concurrently still resolves to exactly one bill.
 */

/**
 * Hand the auto-invoice claim back — but only when it is provably safe.
 *
 * "Was this repair invoiced" is a fact about the invoices collection, NOT about
 * `repair.invoiceID`: createRepairInvoice inserts the invoice document before it writes that
 * field, so a failure in between leaves a real invoice holding a priced snapshot while the
 * repair row still looks unbilled. Releasing on the repair's own field alone would free it and
 * let the next attempt raise a SECOND invoice for work already billed.
 *
 * Fails CLOSED: if the invoices collection can't be reached, the claim is kept. A duplicate
 * bill reaches the customer; a kept claim does not.
 *
 * Recovering a stuck claim: the "Create Invoice Batch" button on Payment & Pickup —
 * ensureRepairsCanBatch never reads closeoutStatus, so it bills the repair regardless.
 *
 * Returns true when an invoice already exists, so callers can say so.
 */
export async function releaseClaimIfUninvoiced(repairID) {
  let alreadyInvoiced;
  try {
    const existing = await RepairInvoicesModel.findAll({ repairIDs: repairID });
    alreadyInvoiced = Array.isArray(existing) && existing.length > 0;
  } catch (lookupError) {
    console.error('Could not confirm invoice state; keeping the claim:', lookupError.message);
    return true;
  }

  if (!alreadyInvoiced) {
    try {
      await RepairsModel.releaseAutoInvoiceClaim(repairID);
    } catch (releaseError) {
      console.error('Failed to release auto-invoice claim:', releaseError.message);
    }
  }
  return alreadyInvoiced;
}

/**
 * Invoice one repair right after QC passes it. Best-effort and never throws: a repair QC
 * passed but could not invoice stays COMPLETED, which is exactly what the closeout tab on
 * Payment & Pickup lists — the failure mode IS the old manual flow.
 *
 * appendToOpen groups per billing account (createRepairInvoice's own semantics), so a
 * wholesale store's repairs pile onto one open invoice and retail customers get one invoice
 * per visit — same grouping the manual batch produced.
 */
export async function autoInvoiceAtQcPass({ repairID, deliveryMethod = 'pickup', createdBy = '' }) {
  try {
    const wonClaim = await RepairsModel.claimForAutoInvoice(repairID);
    if (!wonClaim) {
      return { invoiced: false, reason: 'Repair is already invoiced or being invoiced.' };
    }

    try {
      const invoice = await createRepairInvoice({
        repairIDs: [repairID],
        deliveryMethod,
        createdBy,
        appendToOpen: true,
      });
      return {
        invoiced: true,
        invoiceID: invoice.invoiceID,
        invoiceStatus: invoice.status,
        repairCount: Array.isArray(invoice.repairIDs) ? invoice.repairIDs.length : 0,
      };
    } catch (invoiceError) {
      const alreadyInvoiced = await releaseClaimIfUninvoiced(repairID);
      return {
        invoiced: false,
        reason: alreadyInvoiced
          ? `${invoiceError.message} (an invoice already exists for this repair)`
          : invoiceError.message,
      };
    }
  } catch (error) {
    console.error(`[auto-invoice] QC-pass invoicing failed for ${repairID}:`, error?.message || error);
    return { invoiced: false, reason: error?.message || String(error) };
  }
}
