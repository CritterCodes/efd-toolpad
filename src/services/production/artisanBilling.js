import ArtisanInvoicesModel, { ARTISAN_INVOICE_KIND } from '@/app/api/artisanInvoices/model';
import CastingBatchesModel from '@/app/api/castingBatches/model';
import { markCastingPaid } from '@/services/production/castingBoard';

/**
 * Artisan billing rail (PRODUCTION_RUNS.md §4c). Bills an artisan for fulfilled work — labor +
 * materials × 1.20 (EFD's markup), with shipping/insurance and consumed gems passed through at
 * cost (no markup — §4c), and self-fulfilled work billing NOTHING (own labor realizes at sale, not
 * a bill to yourself). An overdue unpaid invoice FREEZES the artisan (no new runs/WOs/listings).
 * The Stripe hosted invoice is generated via the shared rail; this owns the amount policy + freeze.
 */

export class ArtisanBillingError extends Error {}

/** EFD's markup on fulfilled work (owner: "20% on all COGs"). Kept in sync with castingBoard. */
export const WORK_ORDER_MARKUP_RATE = 0.20;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (n) => Number(n) || 0;

/**
 * The artisan charge for a work order. PURE.
 * Markup applies ONLY to labor + materials; shipping/insurance and gems pass through at cost.
 * Self-fulfilled work bills $0.
 */
export function workOrderCharge({ labor = 0, materials = 0, shipping = 0, gems = 0, markupRate = WORK_ORDER_MARKUP_RATE, selfFulfilled = false } = {}) {
  const breakdown = { labor: num(labor), materials: num(materials), shipping: num(shipping), gems: num(gems), markupRate, selfFulfilled: Boolean(selfFulfilled) };
  if (selfFulfilled) return { total: 0, markedUp: 0, passthrough: 0, breakdown };
  const markedUp = round2((num(labor) + num(materials)) * (1 + markupRate));
  const passthrough = round2(num(shipping) + num(gems));   // at cost, never × markup
  return { total: round2(markedUp + passthrough), markedUp, passthrough, breakdown };
}

/** Whether any invoice in a set is overdue (unpaid + past due). PURE. */
export function hasOverdueInvoices(invoices = [], now = new Date()) {
  return invoices.some((i) => i && i.status === 'pending_payment' && new Date(i.dueAt).getTime() < now.getTime());
}

/**
 * Is this artisan frozen (has an overdue unpaid invoice)? Impure. FAILS OPEN on error — a transient
 * DB blip must not lock out a paying artisan; the overdue bill still exists and re-checks next time.
 */
export async function isArtisanFrozen(userID) {
  if (!userID) return false;
  try {
    const overdue = await ArtisanInvoicesModel.listOverdue(userID);
    return overdue.length > 0;
  } catch {
    return false;
  }
}

/** Guard helper: throw if the artisan is frozen. Guards pass their own Error class for a typed throw. */
export async function assertArtisanNotFrozen(userID, ErrorClass = ArtisanBillingError) {
  if (await isArtisanFrozen(userID)) {
    throw new ErrorClass('Account frozen — an overdue invoice must be paid before starting new work.');
  }
}

/**
 * Turn a RECEIVED casting batch's vendor charge into a canonical artisan invoice (so it enters the
 * freeze + Stripe rail). Idempotent per batch. In-house batches (no vendor charge) are skipped.
 */
export async function billCastingBatch({ batchId, billedEmail = null, createdBy = null }) {
  const batch = await CastingBatchesModel.findById(batchId);
  if (!batch) throw new ArtisanBillingError('casting batch not found');
  if (batch.inHouse || !batch.charge?.amount) return null;   // nothing to bill
  const existing = await ArtisanInvoicesModel.findOneBySource('casting_batch', batchId);
  if (existing) return existing;
  return ArtisanInvoicesModel.create({
    kind: ARTISAN_INVOICE_KIND.CASTING,
    billedUserID: batch.ownerId,
    billedEmail,
    sourceType: 'casting_batch',
    sourceID: batchId,
    runId: batch.runId,
    amount: batch.charge.amount,
    breakdown: { casting: batch.actualCost, markupRate: batch.charge.markupRate },
    description: `Casting${batch.vendor ? ` — ${batch.vendor}` : ''}`,
    createdBy,
  });
}

/** Bill an artisan for a fulfilled work order (labor+materials×1.20, shipping/gems passthrough). */
export async function billWorkOrder({ workOrderID, billedUserID, billedEmail = null, runId = null, labor = 0, materials = 0, shipping = 0, gems = 0, selfFulfilled = false, description = '', createdBy = null }) {
  const charge = workOrderCharge({ labor, materials, shipping, gems, selfFulfilled });
  if (charge.total <= 0) return null;   // self-fulfilled / nothing owed → no invoice
  const existing = await ArtisanInvoicesModel.findOneBySource('work_order', workOrderID);
  if (existing) return existing;
  return ArtisanInvoicesModel.create({
    kind: ARTISAN_INVOICE_KIND.WORK_ORDER,
    billedUserID, billedEmail,
    sourceType: 'work_order', sourceID: workOrderID, runId,
    amount: charge.total, breakdown: charge.breakdown, description, createdBy,
  });
}

/**
 * Mark an artisan invoice paid (the webhook target). If it bills a casting batch, also clear that
 * batch's shipping gate (nothing-ships-unpaid → now shippable).
 */
export async function markArtisanInvoicePaid(invoiceID) {
  const inv = await ArtisanInvoicesModel.findById(invoiceID);
  if (!inv) throw new ArtisanBillingError('artisan invoice not found');
  const paid = await ArtisanInvoicesModel.markPaid(invoiceID);
  if (inv.sourceType === 'casting_batch' && inv.sourceID) {
    await markCastingPaid({ batchId: inv.sourceID, invoiceID });
  }
  return paid;
}

/** Resolve+mark by the Stripe invoice id (webhook carries our invoiceID in metadata; this is the fallback). */
export async function markArtisanInvoicePaidByStripe(stripeInvoiceID) {
  const list = await ArtisanInvoicesModel.list({ stripeInvoiceID });
  if (!list.length) return null;
  return markArtisanInvoicePaid(list[0].invoiceID);
}

/**
 * Push an artisan invoice to Stripe as a hosted invoice (reuses the shared rail with an artisan
 * `kind` so the webhook routes the paid signal back here). Namespaced idempotency via the ainv- id.
 */
export async function pushArtisanInvoiceToStripe(invoiceID) {
  const inv = await ArtisanInvoicesModel.findById(invoiceID);
  if (!inv) throw new ArtisanBillingError('artisan invoice not found');
  if (!inv.billedEmail) throw new ArtisanBillingError('artisan has no billing email on file');
  const { createAndSendStripeInvoice } = await import('@/app/api/custom-orders/stripe');
  const stripe = await createAndSendStripeInvoice({
    invoiceID: inv.invoiceID,
    invoiceNumber: inv.invoiceID,
    customID: inv.runId || inv.invoiceID,
    amountInCents: Math.round(inv.amount * 100),
    customerEmail: inv.billedEmail,
    customerName: null,
    description: inv.description || 'Engel Fine Design — work order',
    dueDays: inv.dueDays,
    kind: inv.kind,               // 'artisan_wo_invoice' | 'casting_charge'
    projectLabel: 'Work',
  });
  await ArtisanInvoicesModel.setStripe(invoiceID, {
    stripeInvoiceID: stripe.id, stripeCustomerID: stripe.customerID, checkoutUrl: stripe.hostedInvoiceUrl,
  });
  return stripe;
}
