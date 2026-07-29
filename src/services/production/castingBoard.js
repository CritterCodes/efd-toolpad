import PiecesModel from '@/app/api/pieces/model';
import CastingBatchesModel, { CASTING_STATUS } from '@/app/api/castingBatches/model';
import { getWorkOrderMarkupMultiplier, applyWorkOrderMarkup } from '@/services/production/workOrderPricing';

/**
 * Casting board (PRODUCTION_RUNS.md §4.1). Ownership-scoped batch lifecycle with invoice-at-receipt
 * and the nothing-ships-unpaid gate. This service records the amount owed, the paid state, and the
 * shipping gate, and splits the actual casting cost onto the run's piece COGS at receipt.
 *
 * The `artisanInvoices` row is created/settled/voided by `castingSettlement` at the route layer
 * (import cycle: artisanBilling → castingBoard). A HOSTED Stripe invoice is NOT yet sent —
 * `pushArtisanInvoiceToStripe` exists but has no caller, so today staff record payment by hand
 * (U-BILL-2 wires the hosted-invoice path).
 */

export class CastingError extends Error {}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * The artisan's casting charge = actual vendor cost × the wholesale markup MULTIPLIER (sourced from
 * admin settings by the caller; owner: use the wholesale markup setting, not a hardcoded number). PURE.
 */
export function castingChargeFromCost(actualCost, markupMultiplier) {
  return applyWorkOrderMarkup(actualCost, markupMultiplier);
}

/**
 * Split an actual casting cost across a run's pieces for COGS (equal split; last piece absorbs the
 * rounding remainder so the parts sum exactly to the total). PURE.
 * PROPOSED (overnight, §4g open probe "casting metal → COGS split"): equal per-piece division.
 */
export function splitCastingCost(actualCost, pieceCount) {
  const total = round2(actualCost);
  const n = Math.max(1, Number(pieceCount) || 1);
  const each = round2(total / n);
  const parts = Array.from({ length: n }, () => each);
  parts[n - 1] = round2(total - each * (n - 1));   // remainder on the last piece
  return parts;
}

/** 48h dispute window opens at DELIVERY to the artisan (§4.1). PURE. */
export function disputeDeadlineFrom(deliveredAt, hours = 48) {
  const base = deliveredAt instanceof Date ? deliveredAt : new Date(deliveredAt);
  return new Date(base.getTime() + hours * 3600 * 1000);
}

/** Whether the artisan's dispute window has lapsed (→ auto-accept). PURE. */
export function isPastDisputeWindow(batch, now = new Date()) {
  if (!batch?.disputeDeadline) return false;
  const deadline = batch.disputeDeadline instanceof Date ? batch.disputeDeadline : new Date(batch.disputeDeadline);
  return now.getTime() >= deadline.getTime();
}

const ALLOWED = {
  needs_ordering: ['ordered', 'cancelled'],
  ordered: ['received', 'cancelled'],
  received: ['delivered', 'cancelled'],
  delivered: ['disputed', 'accepted'],
  disputed: ['accepted', 'ordered', 'cancelled'],   // re-order the failed casting or resolve
  accepted: [],
  cancelled: [],
};
/** Validate a lifecycle transition. PURE. */
export function canTransition(from, to) {
  return Boolean(ALLOWED[from]?.includes(to));
}

// ── DB lifecycle ────────────────────────────────────────────────────────────

export async function createCastingBatch({ runId = null, ownerId, designID, pieceIDs, vendor = null, estCost = null, createdBy = null }) {
  return CastingBatchesModel.create({ runId, ownerId, designID, pieceIDs, vendor, estCost, createdBy });
}

async function transition(batchId, to) {
  const batch = await CastingBatchesModel.findById(batchId);
  if (!batch) throw new CastingError('casting batch not found');
  if (!canTransition(batch.status, to)) throw new CastingError(`cannot move casting from ${batch.status} to ${to}`);
  return batch;
}

export async function markCastingOrdered({ batchId, vendor = null, estCost = null }) {
  const batch = await transition(batchId, CASTING_STATUS.ORDERED);
  // Same shape guard as actualCost (below): only a genuine finite non-negative number may overwrite
  // the estimate. `Number('abc')` would otherwise store NaN and `1e999` would store Infinity, which
  // renders as "∞" on the board. Anything else keeps the existing estimate.
  const est = typeof estCost === 'number' ? estCost
    : (typeof estCost === 'string' && estCost.trim() !== '' ? Number(estCost) : NaN);
  return CastingBatchesModel.updateById(batchId, {
    status: CASTING_STATUS.ORDERED,
    vendor: vendor ?? batch.vendor,
    estCost: Number.isFinite(est) && est >= 0 ? est : batch.estCost,
    orderedAt: new Date(),
  });
}

/**
 * Receive the casting: the ACTUAL vendor cost is now known. Split it onto the run's piece COGS, fire
 * the artisan charge (actual × the wholesale markup), and gate the batch from shipping until that
 * charge is settled. Every batch is a vendor batch (peer/in-house casting was scrapped), so this is
 * unconditional. The route additionally turns the charge into an `artisanInvoices` row so the debt
 * reaches the freeze — see `castingSettlement.billReceivedCasting`; it can't be called from here
 * without an import cycle (artisanBilling already imports this module).
 */
export async function markCastingReceived({ batchId, actualCost }) {
  const batch = await transition(batchId, CASTING_STATUS.RECEIVED);
  // Must be an explicit FINITE non-negative number. `Number(null) === 0` and `Number(undefined)` is
  // NaN, so a missing/Infinity-serialized-to-null actualCost would otherwise receive the casting at
  // $0 — zero COGS on every piece and a $0 charge — and report success.
  const cost = typeof actualCost === 'number' ? actualCost
    : (typeof actualCost === 'string' && actualCost.trim() !== '' ? Number(actualCost) : NaN);
  if (!Number.isFinite(cost) || cost < 0) throw new CastingError('actualCost must be an explicit non-negative number');

  const parts = splitCastingCost(cost, batch.pieceIDs.length);
  for (let i = 0; i < batch.pieceIDs.length; i += 1) {
    await PiecesModel.upsertMaterialByCategory(batch.pieceIDs[i], 'casting', {
      id: `cast-${batchId}-${i}`,
      name: batch.vendor ? `Casting — ${batch.vendor}` : 'Casting',
      unitCost: parts[i], qty: 1, vendor: batch.vendor ?? '',
    });
  }

  // Every batch is a VENDOR batch (peer/in-house casting was scrapped), so a receipt always mints a
  // charge and always gates shipping until it's settled.
  const markupMultiplier = await getWorkOrderMarkupMultiplier();   // wholesale markup from admin settings
  const patch = {
    status: CASTING_STATUS.RECEIVED,
    actualCost: round2(cost),
    receivedAt: new Date(),
    charge: { amount: castingChargeFromCost(cost, markupMultiplier), markupMultiplier, paid: false, paidAt: null, invoiceID: null },
    shippingGated: true,   // nothing ships to the artisan until this is settled
  };
  return CastingBatchesModel.updateById(batchId, patch);
}

/**
 * Record payment of the casting charge — clears the shipping gate ONLY. Callers: the staff `pay`
 * route and the Stripe webhook (markArtisanInvoicePaid). Both must also resolve the `artisanInvoices`
 * row, or the debt goes overdue and freezes an artisan who already paid — see castingSettlement.
 */
export async function markCastingPaid({ batchId, invoiceID = null }) {
  const batch = await CastingBatchesModel.findById(batchId);
  if (!batch) throw new CastingError('casting batch not found');
  return CastingBatchesModel.updateById(batchId, {
    charge: { ...batch.charge, paid: true, paidAt: new Date(), invoiceID: invoiceID ?? batch.charge?.invoiceID ?? null },
    shippingGated: false,
  });
}

/** Ship/hand the casting to the artisan — REFUSED while the charge is unpaid (nothing ships unpaid). */
export async function markCastingDelivered({ batchId }) {
  const batch = await transition(batchId, CASTING_STATUS.DELIVERED);
  if (batch.shippingGated && !batch.charge?.paid) throw new CastingError('casting is gated from shipping until the invoice is paid');
  const deliveredAt = new Date();
  return CastingBatchesModel.updateById(batchId, {
    status: CASTING_STATUS.DELIVERED,
    deliveredAt,
    disputeDeadline: disputeDeadlineFrom(deliveredAt),
  });
}

/** Artisan disputes a delivered casting within the 48h window (§4.1 — casting failure liability). */
export async function disputeCasting({ batchId, reason = null }) {
  const batch = await transition(batchId, CASTING_STATUS.DISPUTED);
  if (isPastDisputeWindow(batch)) throw new CastingError('the 48-hour dispute window has closed');
  return CastingBatchesModel.updateById(batchId, {
    status: CASTING_STATUS.DISPUTED, disputedAt: new Date(), disputeReason: reason,
  });
}

/** Accept a delivered casting (explicit, or auto-accept once the window lapses). */
export async function acceptCasting({ batchId, auto = false }) {
  const batch = await CastingBatchesModel.findById(batchId);
  if (!batch) throw new CastingError('casting batch not found');
  if (batch.status === CASTING_STATUS.ACCEPTED) return batch;
  if (!canTransition(batch.status, CASTING_STATUS.ACCEPTED)) throw new CastingError(`cannot accept casting from ${batch.status}`);
  if (auto && !isPastDisputeWindow(batch)) throw new CastingError('dispute window still open — cannot auto-accept');
  return CastingBatchesModel.updateById(batchId, { status: CASTING_STATUS.ACCEPTED, acceptedAt: new Date() });
}

/**
 * Cancel a casting batch (pre-acceptance). Clears the ship gate: a cancelled batch will never ship,
 * so leaving `shippingGated` set only renders a dead "gated from shipping" warning with no action
 * behind it. Safe because `cancelled` has no onward transitions — `markCastingDelivered` still
 * refuses. If the batch was already invoiced, the ROUTE voids that invoice (voidCastingInvoice);
 * it can't be called from here without an import cycle through artisanBilling.
 */
export async function cancelCastingBatch({ batchId }) {
  const batch = await transition(batchId, CASTING_STATUS.CANCELLED);
  return CastingBatchesModel.updateById(batchId, {
    status: CASTING_STATUS.CANCELLED,
    cancelledAt: new Date(),
    shippingGated: false,
  });
}
