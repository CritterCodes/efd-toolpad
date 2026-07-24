import { db } from '@/lib/database';
import { randomUUID } from 'crypto';
import Constants from '@/lib/constants';

/**
 * A Shipment — one physical handoff of pieces between two parties (PRODUCTION_RUNS.md §4.2).
 * Minimum viable: from/to, carrier, tracking, the pieces, status, and a declared-value insurance
 * line billed through at cost. Nothing ships unpaid — a shipment gated on a casting/WO charge
 * cannot be marked shipped until that charge is paid.
 */
export const SHIPMENT_STATUS = Object.freeze({
  PENDING: 'pending',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
});

export function validateShipment(data = {}) {
  const errors = [];
  if (!data.from || !data.from.type) errors.push('from.type is required');
  if (!data.to || !data.to.type) errors.push('to.type is required');
  if (!Array.isArray(data.pieceIDs) || data.pieceIDs.length === 0) errors.push('pieceIDs[] is required');
  if (data.status && !Object.values(SHIPMENT_STATUS).includes(data.status)) errors.push('invalid shipment status');
  return { valid: errors.length === 0, errors };
}

export function buildShipment(data = {}) {
  const now = new Date();
  return {
    shipmentId: data.shipmentId || randomUUID(),
    from: data.from ?? null,           // { type:'efd'|'artisan', userID? }
    to: data.to ?? null,
    ownerId: data.ownerId ?? null,     // the artisan whose run this serves (scoping)
    runId: data.runId ?? null,
    pieceIDs: Array.isArray(data.pieceIDs) ? data.pieceIDs : [],
    castingBatchId: data.castingBatchId ?? null,   // gate source — must be paid before shipping
    carrier: data.carrier ?? null,
    tracking: data.tracking ?? null,
    declaredValue: data.declaredValue != null ? Number(data.declaredValue) : null,
    insuranceRate: data.insuranceRate ?? null,
    insuranceAmount: data.insuranceAmount != null ? Number(data.insuranceAmount) : null,
    status: data.status || SHIPMENT_STATUS.PENDING,
    shippedAt: data.shippedAt ?? null,
    deliveredAt: data.deliveredAt ?? null,
    createdBy: data.createdBy ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

export default class ShipmentsModel {
  static COLLECTION = Constants.SHIPMENTS_COLLECTION;
  static async collection() { return (await db.connect()).collection(this.COLLECTION); }

  static async ensureIndexes() {
    const col = await this.collection();
    await Promise.all([
      col.createIndex({ shipmentId: 1 }, { unique: true }),
      col.createIndex({ ownerId: 1, status: 1 }),
      col.createIndex({ runId: 1 }),
      col.createIndex({ castingBatchId: 1 }),
    ]);
  }

  static async create(data) {
    const shipment = buildShipment(data);
    const validation = validateShipment(shipment);
    if (!validation.valid) throw new TypeError(validation.errors.join('; '));
    await (await this.collection()).insertOne(shipment);
    return shipment;
  }

  static async findById(shipmentId) { return (await this.collection()).findOne({ shipmentId }, { projection: { _id: 0 } }); }
  static async list(filter = {}) { return (await this.collection()).find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray(); }

  static async updateById(shipmentId, updateData) {
    await (await this.collection()).updateOne({ shipmentId }, { $set: { ...updateData, updatedAt: new Date() } });
    return this.findById(shipmentId);
  }
}
