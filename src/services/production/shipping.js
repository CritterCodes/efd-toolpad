import ShipmentsModel, { SHIPMENT_STATUS } from '@/app/api/shipments/model';
import CastingBatchesModel from '@/app/api/castingBatches/model';

/**
 * Shipping legs (PRODUCTION_RUNS.md §4.2). One shipment per handoff, with declared-value insurance
 * billed through at cost, and the nothing-ships-unpaid gate: a shipment tied to a casting batch
 * can't ship until that batch's charge is paid (its `shippingGated` is cleared).
 */

export class ShippingError extends Error {}

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Declared-value insurance is billed through AT COST — it's the carrier's ACTUAL charge for the
// declared value, entered per shipment (like the casting actual cost), not a computed % of our own.
// So there is no hardcoded rate and no setting: `insuranceAmount` is the pass-through amount.

const ALLOWED = {
  pending: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};
/** Validate a shipment transition. PURE. */
export function canShipTransition(from, to) {
  return Boolean(ALLOWED[from]?.includes(to));
}

/**
 * Whether a shipment is clear to ship given its gate source's state. PURE.
 *
 * Two independent refusals, deliberately NOT collapsed into one:
 *  1. the ship gate is up and the charge is unpaid (nothing ships unpaid), and
 *  2. an OUTSTANDING recorded charge — a charge amount that was never paid — regardless of the
 *     `shippingGated` flag. The flag is mutable bookkeeping; the unpaid amount is the actual fact.
 *     Without (2), any future code path that clears the flag without settling the money silently
 *     opens the gate. That is not hypothetical: cancelling a batch used to clear it, and legacy
 *     batches received before invoicing existed carry a charge with no invoice behind it.
 * A CANCELLED batch is never clear to ship either — nothing is coming.
 */
export function isClearToShip({ castingBatch = null } = {}) {
  if (!castingBatch) return true;
  if (castingBatch.status === 'cancelled') return false;
  const owes = castingBatch.charge?.amount != null && !castingBatch.charge?.paid;
  if (owes) return false;
  if (castingBatch.shippingGated && !castingBatch.charge?.paid) return false;
  return true;
}

export async function createShipment({ from, to, ownerId = null, runId = null, pieceIDs, castingBatchId = null, carrier = null, tracking = null, declaredValue = null, insuranceAmount = null, createdBy = null }) {
  return ShipmentsModel.create({
    from, to, ownerId, runId, pieceIDs, castingBatchId, carrier, tracking,
    declaredValue: declaredValue != null ? Number(declaredValue) : null,
    // Pass-through at cost: the carrier's actual insurance charge, entered by whoever books it.
    insuranceAmount: insuranceAmount != null ? round2(insuranceAmount) : null,
    createdBy,
  });
}

/** Mark a shipment shipped — REFUSED while its gate source (casting charge) is unpaid. */
export async function markShipped({ shipmentId, carrier = null, tracking = null }) {
  const shipment = await ShipmentsModel.findById(shipmentId);
  if (!shipment) throw new ShippingError('shipment not found');
  if (!canShipTransition(shipment.status, SHIPMENT_STATUS.SHIPPED)) throw new ShippingError(`cannot ship from ${shipment.status}`);
  if (shipment.castingBatchId) {
    const batch = await CastingBatchesModel.findById(shipment.castingBatchId);
    if (!isClearToShip({ castingBatch: batch })) throw new ShippingError('nothing ships unpaid — the casting charge must be paid first');
  }
  return ShipmentsModel.updateById(shipmentId, {
    status: SHIPMENT_STATUS.SHIPPED, shippedAt: new Date(),
    carrier: carrier ?? shipment.carrier, tracking: tracking ?? shipment.tracking,
  });
}

export async function markDelivered({ shipmentId }) {
  const shipment = await ShipmentsModel.findById(shipmentId);
  if (!shipment) throw new ShippingError('shipment not found');
  if (!canShipTransition(shipment.status, SHIPMENT_STATUS.DELIVERED)) throw new ShippingError(`cannot deliver from ${shipment.status}`);
  return ShipmentsModel.updateById(shipmentId, { status: SHIPMENT_STATUS.DELIVERED, deliveredAt: new Date() });
}

export async function cancelShipment({ shipmentId }) {
  const shipment = await ShipmentsModel.findById(shipmentId);
  if (!shipment) throw new ShippingError('shipment not found');
  if (!canShipTransition(shipment.status, SHIPMENT_STATUS.CANCELLED)) throw new ShippingError(`cannot cancel from ${shipment.status}`);
  return ShipmentsModel.updateById(shipmentId, { status: SHIPMENT_STATUS.CANCELLED });
}
