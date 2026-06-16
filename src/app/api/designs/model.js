import { db } from '@/lib/database';
import { randomUUID } from 'crypto';
import Constants from '@/lib/constants';

export const DESIGN_STATUS = {
  CONCEPT: 'concept',
  CAD: 'cad',
  APPROVED_FOR_PRODUCTION: 'approved_for_production',
  RETIRED: 'retired',
};

/**
 * A reusable manufacturing spec + IP (CAD, BOM, routing, estimated cost).
 * See docs/manufacturing/data-model.md. Costs are computed via
 * src/services/production/designCost.js.
 *
 * NOTE: a legacy orphaned `designs` API (mock GET, cross-DB POST) still exists at
 * src/app/api/designs/route.js — to be replaced/absorbed in the S3 API slice.
 */
export default class DesignsModel {
  static COLLECTION = Constants.DESIGNS_COLLECTION;

  static async collection() {
    const dbInstance = await db.connect();
    return dbInstance.collection(this.COLLECTION);
  }

  static async ensureIndexes() {
    const col = await this.collection();
    await Promise.all([
      col.createIndex({ designID: 1 }, { unique: true }),
      col.createIndex({ dropID: 1 }),
      col.createIndex({ status: 1 }),
    ]);
  }

  static async create(data) {
    const col = await this.collection();
    const now = new Date();
    const design = {
      designID: data.designID || randomUUID(),
      dropID: data.dropID ?? null,
      name: data.name ?? '',
      description: data.description ?? null,
      designerUserID: data.designerUserID ?? null,
      cadFiles: Array.isArray(data.cadFiles) ? data.cadFiles : [],
      renders: Array.isArray(data.renders) ? data.renders : [],
      referenceImages: Array.isArray(data.referenceImages) ? data.referenceImages : [],
      stlVolumeCm3: data.stlVolumeCm3 ?? null,
      metalOptions: Array.isArray(data.metalOptions) ? data.metalOptions : [],
      bom: data.bom ?? { castingEstimate: 0, stones: [], findings: [], estMaterialCost: 0 },
      routing: Array.isArray(data.routing) ? data.routing : [],
      estCost: data.estCost ?? null,
      suggestedRetail: data.suggestedRetail ?? null,
      status: data.status || DESIGN_STATUS.CONCEPT,
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy ?? null,
    };
    await col.insertOne(design);
    return design;
  }

  static async findById(designID) {
    const col = await this.collection();
    return col.findOne({ designID }, { projection: { _id: 0 } });
  }

  static async list(filter = {}) {
    const col = await this.collection();
    return col.find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  }

  static async findByDrop(dropID) {
    const col = await this.collection();
    return col.find({ dropID }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  }

  static async updateById(designID, updateData) {
    const col = await this.collection();
    await col.updateOne({ designID }, { $set: { ...updateData, updatedAt: new Date() } });
    return this.findById(designID);
  }
}
