import ShipmentsModel, { SHIPMENT_STATUS } from '@/app/api/shipments/model';
import CastingBatchesModel from '@/app/api/castingBatches/model';

/**
 * Shipping legs (PRODUCTION_RUNS.md §4.2). One shipment per handoff, with declared-value insurance
 * billed through at cost, and the nothing-ships-unpaid gate: a shipment tied to a casting batch
 * can't ship until that batch's charge is paid (its `shippingGated` is cleared).
 */

export class ShippingError extends Error {}

/** Declared-value insurance rate (placeholder — owner to set the real carrier rate). */
export const DECLARED_VALUE_INSURANCE_RATE = 0.01;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Insurance line for a declared value (billed through at cost). PURE. */
export function insuranceForDeclaredValue(declaredValue, rate = DECLARED_VALUE_INSURANCE_RATE) {
  return round2((Number(declaredValue) || 0) * rate);
}

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

/** Whether a shipment is clear to ship given its gate source's paid state. PURE. */
export function isClearToShip({ castingBatch = null } = {}) {
  if (castingBatch && castingBatch.shippingGated && !castingBatch.charge?.paid) return false;
  return true;
}

export async function createShipment({ from, to, ownerId = null, runId = null, pieceIDs, castingBatchId = null, carrier = null, tracking = null, declaredValue = null, createdBy = null }) {
  const insuranceAmount = declaredValue != null ? insuranceForDeclaredValue(declaredValue) : null;
  return ShipmentsModel.create({
    from, to, ownerId, runId, pieceIDs, castingBatchId, carrier, tracking,
    declaredValue, insuranceRate: declaredValue != null ? DECLARED_VALUE_INSURANCE_RATE : null, insuranceAmount,
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
