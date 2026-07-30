import ArtisanInvoicesModel, { ARTISAN_INVOICE_KIND } from '@/app/api/artisanInvoices/model';
import CastingBatchesModel from '@/app/api/castingBatches/model';
import { markCastingPaid } from '@/services/production/castingBoard';
import { getWorkOrderMarkupMultiplier, applyWorkOrderMarkup, DEFAULT_WO_MARKUP } from '@/services/production/workOrderPricing';
import { STAFF_ROLES } from '@/lib/designPermissions';

/**
 * Artisan billing rail (PRODUCTION_RUNS.md §4c). Bills an artisan for fulfilled work — labor +
 * materials × the WHOLESALE MARKUP from admin settings (a multiplier; never a hardcoded number —
 * see workOrderPricing), with shipping/insurance and consumed gems passed through at cost (no
 * markup — §4c), and self-fulfilled work billing NOTHING (own labor realizes at sale, not a bill to
 * yourself). An overdue unpaid invoice FREEZES the artisan (no new runs/WOs/listings).
 * This owns the amount policy + the freeze. `pushArtisanInvoiceToStripe` (below) would make it a
 * hosted Stripe invoice, but nothing calls it yet — staff record payment by hand until U-BILL-2.
 */

export class ArtisanBillingError extends Error {}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (n) => Number(n) || 0;

/**
 * The artisan charge for a work order. PURE.
 * `markupMultiplier` is the wholesale markup from admin settings (sourced by the caller; owner:
 * use the wholesale markup setting, not a hardcoded number). Markup applies ONLY to labor +
 * materials (charge = (labor+materials) × multiplier); shipping/insurance and gems pass through at
 * cost. Self-fulfilled work bills $0.
 */
export function workOrderCharge({ labor = 0, materials = 0, shipping = 0, gems = 0, markupMultiplier = DEFAULT_WO_MARKUP, selfFulfilled = false } = {}) {
  const breakdown = { labor: num(labor), materials: num(materials), shipping: num(shipping), gems: num(gems), markupMultiplier, selfFulfilled: Boolean(selfFulfilled) };
  if (selfFulfilled) return { total: 0, markedUp: 0, passthrough: 0, breakdown };
  const markedUp = applyWorkOrderMarkup(num(labor) + num(materials), markupMultiplier);
  const passthrough = round2(num(shipping) + num(gems));   // at cost, never × markup
  return { total: round2(markedUp + passthrough), markedUp, passthrough, breakdown };
}

/**
 * Is this user EFD itself (staff/owner) rather than an outside artisan? Impure (reads `users`).
 *
 * EFD DOES NOT BILL EFD (owner's call, 2026-07-29). Staff use the same rails as artisans — the owner
 * creates runs and orders casting like anyone else — but invoicing yourself is fake money, and an
 * unpaid one would trip `isArtisanFrozen` and lock the owner out of his own platform.
 * Mirrors the rule work orders already had (`selfFulfilled` bills $0), which casting never got.
 *
 * FAILS CLOSED (returns false ⇒ "bill them") on a DB error: wrongly skipping a bill silently loses
 * real revenue and hands out free casting, while a wrong bill is visible and clearable by staff.
 */
export async function isEfdSelf(userID) {
  if (!userID) return false;
  try {
    const { db } = await import('@/lib/database');
    const dbInstance = await db.connect();
    const user = await dbInstance.collection('users').findOne(
      // A plain string only — an operator object ({$ne:null}) would match an arbitrary user and turn
      // this into a free-casting exemption for whoever can reach the caller.
      { userID: String(userID) },
      { projection: { _id: 0, role: 1 } },
    );
    // STAFF_ROLES, not an inline copy — an earlier commit claimed this shared the canonical set while
    // still hardcoding its own. The values matched, so nothing broke; the drift was the hazard.
    return STAFF_ROLES.includes(user?.role);
  } catch {
    return false;
  }
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
 * Turn a RECEIVED casting batch's vendor charge into a canonical artisan invoice — this is what puts
 * casting debt on the `artisanInvoices` rail, which is what makes `isArtisanFrozen` (and therefore
 * the whole nothing-is-fronted freeze) actually fire for casting. Idempotent per batch.
 *
 * `amount` is always `batch.charge.amount` — the charge the board recorded — never a figure this
 * module derives. Casting is billed AT COST (no markup on Carrera orders, owner 2026-07-29), so today
 * that equals `actualCost`; reading the charge rather than recomputing means the pricing policy lives
 * in exactly one place (castingChargeFromCost) and legacy marked-up rows still bill what they say.
 *
 * Called from the casting `receive` route (via castingSettlement), NOT from castingBoard: this module
 * already imports castingBoard (markCastingPaid), so the reverse import would be a cycle.
 *
 * "Idempotent per batch" doubles as the RE-CAST POLICY: after `disputed → ordered → receive` the
 * batch mints a NEW `charge.amount`, but this returns the ORIGINAL invoice — so a failed casting is
 * never billed twice and EFD/the vendor eats the re-cast (§4.1 casting-failure liability). Known
 * consequence: `invoice.amount` then diverges from `batch.charge.amount`, and the second casting has
 * no invoice of its own. If that policy changes, key idempotency on the charge, not the batch.
 */
export async function billCastingBatch({ batchId, billedEmail = null, createdBy = null }) {
  const batch = await CastingBatchesModel.findById(batchId);
  if (!batch) throw new ArtisanBillingError('casting batch not found');
  if (!batch.charge?.amount) return null;   // nothing to bill (not yet received)
  // EFD doesn't bill EFD. The actual casting cost is still split onto the pieces' COGS by
  // markCastingReceived (a separate path), so owner-owned runs keep correct costing — they just
  // don't get a receivable that could freeze the owner out of his own platform.
  if (await isEfdSelf(batch.ownerId)) return null;
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
    breakdown: {
      casting: batch.actualCost,
      // Pass-through = billed at cost. Kept explicit so a marked-up legacy row (multiplier set) is
      // still legible in the audit trail rather than silently reinterpreted as at-cost.
      passthrough: batch.charge.passthrough === true,
      markupMultiplier: batch.charge.markupMultiplier ?? null,
    },
    description: `Casting${batch.vendor ? ` — ${batch.vendor}` : ''}`,
    createdBy,
  });
}

/** Bill an artisan for a fulfilled work order (labor+materials × wholesale markup, shipping/gems at cost). */
export async function billWorkOrder({ workOrderID, billedUserID, billedEmail = null, runId = null, labor = 0, materials = 0, shipping = 0, gems = 0, selfFulfilled = false, description = '', createdBy = null }) {
  const markupMultiplier = await getWorkOrderMarkupMultiplier();   // wholesale markup from admin settings
  const charge = workOrderCharge({ labor, materials, shipping, gems, markupMultiplier, selfFulfilled });
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
