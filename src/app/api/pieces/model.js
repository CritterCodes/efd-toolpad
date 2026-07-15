import { db } from '@/lib/database';
import { randomUUID } from 'crypto';
import Constants from '@/lib/constants';
import { computePieceCosts } from '@/services/production/pieceCost';

export const PIECE_STATUS = {
  PLANNED: 'planned',
  CASTING_ORDERED: 'casting_ordered',
  IN_FINISHING: 'in_finishing',
  QC: 'qc',
  COMPLETED: 'completed',
  AVAILABLE: 'available',
  RESERVED: 'reserved',
  SOLD: 'sold',
  SCRAPPED: 'scrapped',
  RETURNED: 'returned',
  CANCELLED: 'cancelled',
};

export function validatePiece(data = {}) {
  const errors = [];
  if (!data.designID) errors.push('designID is required');
  if (!data.variantId) errors.push('variantId is required');
  if (!data.resolvedConfiguration || typeof data.resolvedConfiguration !== 'object') errors.push('resolvedConfiguration is required');
  if (!Object.values(PIECE_STATUS).includes(data.status)) errors.push('invalid piece status');
  if (data.editionNumber !== null && data.editionNumber !== undefined && (!Number.isInteger(data.editionNumber) || data.editionNumber < 1)) errors.push('editionNumber must be a positive integer');
  return { valid: errors.length === 0, errors };
}

/**
 * A physical instance produced from a Design. Carries actual COGS (materials at
 * cost + accrued labor from its work orders) and availability status.
 * See docs/manufacturing/data-model.md.
 */
export default class PiecesModel {
  static COLLECTION = Constants.PIECES_COLLECTION;

  static async collection() {
    const dbInstance = await db.connect();
    return dbInstance.collection(this.COLLECTION);
  }

  static async ensureIndexes() {
    const col = await this.collection();
    await Promise.all([
      col.createIndex({ pieceID: 1 }, { unique: true }),
      col.createIndex({ designID: 1, variantId: 1 }),
      col.createIndex({ status: 1 }),
      col.createIndex({ productID: 1 }),
      col.createIndex({ designID: 1, editionNumber: 1 }, { unique: true, sparse: true }),
    ]);
  }

  static async create(data) {
    const col = await this.collection();
    const now = new Date();
    const actualMaterials = Array.isArray(data.actualMaterials) ? data.actualMaterials : [];
    const piece = {
      pieceID: data.pieceID || randomUUID(),
      designID: data.designID ?? null,
      variantId: data.variantId ?? null,
      resolvedConfiguration: structuredClone(data.resolvedConfiguration ?? {}),
      editionNumber: data.editionNumber ?? null,
      gemstoneId: data.gemstoneId ?? null,   // originating gemstone (flywheel; Pipeline M1-T2)
      dropId: data.dropId ?? null,
      sku: data.sku ?? null,
      serialNumber: data.serialNumber ?? null,
      metalType: data.metalType ?? null,
      karat: data.karat ?? null,
      finish: data.finish ?? null,
      ringSize: data.ringSize ?? null,
      dimensions: data.dimensions ?? null,
      weight: data.weight ?? null,
      stones: Array.isArray(data.stones) ? data.stones : [],
      actualMaterials,
      workOrderIDs: Array.isArray(data.workOrderIDs) ? data.workOrderIDs : [],
      status: data.status || PIECE_STATUS.PLANNED,
      productID: data.productID ?? null,
      customerID: data.customerID ?? null,
      customOrderID: data.customOrderID ?? null,   // present for custom-order pieces (S7)
      billing: data.billing ?? null,
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy ?? null,
      ...computePieceCosts({ actualMaterials, laborLogs: [] }),
    };
    const validation = validatePiece(piece);
    if (!validation.valid) throw new TypeError(validation.errors.join('; '));
    await col.insertOne(piece);
    return piece;
  }

  static async findById(pieceID) {
    const col = await this.collection();
    return col.findOne({ pieceID }, { projection: { _id: 0 } });
  }

  static async list(filter = {}) {
    const col = await this.collection();
    return col.find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  }

  static async findByDesign(designID) {
    const col = await this.collection();
    return col.find({ designID }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  }

  static async updateById(pieceID, updateData) {
    const col = await this.collection();
    await col.updateOne({ pieceID }, { $set: { ...updateData, updatedAt: new Date() } });
    return this.findById(pieceID);
  }

  static async setWorkOrders(pieceID, workOrderIDs) {
    return this.updateById(pieceID, { workOrderIDs });
  }

  static async addMaterial(pieceID, material) {
    const col = await this.collection();
    await col.updateOne({ pieceID }, { $push: { actualMaterials: material }, $set: { updatedAt: new Date() } });
    return this.recomputeCosts(pieceID);
  }

  /**
   * Idempotently record a single-instance material (e.g. casting): replace any
   * existing line in the same `category` rather than pushing a duplicate. Without
   * this, clicking "Casting received" twice (or re-testing) double-counts the
   * casting cost into COGS. Pass a stable `category` to scope the replacement.
   */
  static async upsertMaterialByCategory(pieceID, category, material) {
    const col = await this.collection();
    await col.updateOne({ pieceID }, { $pull: { actualMaterials: { category } } });
    await col.updateOne(
      { pieceID },
      { $push: { actualMaterials: { ...material, category } }, $set: { updatedAt: new Date() } },
    );
    return this.recomputeCosts(pieceID);
  }

  /** Re-roll COGS from the piece's actual materials + the labor logged on its work orders. */
  static async recomputeCosts(pieceID) {
    const piece = await this.findById(pieceID);
    if (!piece) return null;
    const dbInstance = await db.connect();
    const laborLogs = (piece.workOrderIDs && piece.workOrderIDs.length)
      ? await dbInstance.collection(Constants.LABOR_LOGS_COLLECTION)
          .find({ workOrderID: { $in: piece.workOrderIDs } }, { projection: { creditedValue: 1 } })
          .toArray()
      : [];
    const costs = computePieceCosts({ actualMaterials: piece.actualMaterials, laborLogs });
    return this.updateById(pieceID, costs);
  }
}
