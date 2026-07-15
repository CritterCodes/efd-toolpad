import { db } from '@/lib/database';
import { randomUUID } from 'crypto';
import Constants from '@/lib/constants';

export const DESIGN_STATUS = {
  DRAFT: 'draft',
  CAD_REQUESTED: 'cad_requested',
  CAD_IN_PROGRESS: 'cad_in_progress',
  CAD_QC: 'cad_qc',
  READY: 'ready',
  RETIRED: 'retired',
};

export const EDITION_TYPE = Object.freeze({ ONE_OF_ONE: 'one_of_one', LIMITED: 'limited', UNLIMITED: 'unlimited' });
export const PRODUCTION_METHOD = Object.freeze({ CAD_CAST: 'cad_cast', HANDMADE: 'handmade', HYBRID: 'hybrid' });

export function validateDesign(data = {}, { requireSellable = false } = {}) {
  const errors = [];
  if (!Object.values(DESIGN_STATUS).includes(data.status)) errors.push('invalid design status');
  if (!Object.values(PRODUCTION_METHOD).includes(data.productionMethod)) errors.push('invalid productionMethod');
  if (!Object.values(EDITION_TYPE).includes(data.edition?.type)) errors.push('invalid edition type');
  if (data.edition?.type === EDITION_TYPE.LIMITED && (!Number.isInteger(data.edition.limit) || data.edition.limit < 1)) errors.push('limited edition requires a positive integer limit');
  if ((data.edition?.allocated || 0) < 0 || (data.edition?.committed || 0) < 0) errors.push('edition counters cannot be negative');
  if (data.edition?.type !== EDITION_TYPE.UNLIMITED && (data.edition?.allocated || 0) + (data.edition?.committed || 0) > (data.edition?.limit || (data.edition?.type === EDITION_TYPE.ONE_OF_ONE ? 1 : 0))) errors.push('edition capacity exceeded');
  const variants = data.variants || [];
  if (requireSellable && !variants.some((variant) => variant.active)) errors.push('sellable design requires an active variant');
  const ids = variants.map((variant) => variant.variantId);
  const skus = variants.map((variant) => variant.sku);
  if (ids.some((id) => !id) || new Set(ids).size !== ids.length) errors.push('variantId must be present and unique');
  if (skus.some((sku) => !sku) || new Set(skus).size !== skus.length) errors.push('variant sku must be present and unique');
  variants.forEach((variant) => {
    if (data.category === 'ring' && (variant.ringSize === undefined || variant.ringSize === null || variant.ringSize === '')) errors.push(`${variant.variantId || 'variant'} requires one nominal ringSize`);
    if (data.category !== 'ring' && (variant.ringSize !== undefined || variant.sizingAllowance !== undefined)) errors.push(`${variant.variantId || 'variant'} ring sizing is only valid for rings`);
    if (variant.sizingAllowance && Number(variant.sizingAllowance.min) > Number(variant.sizingAllowance.max)) errors.push(`${variant.variantId || 'variant'} sizingAllowance min must not exceed max`);
  });
  return { valid: errors.length === 0, errors };
}

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
      col.createIndex({ dropId: 1 }),
      col.createIndex({ primaryArtisanId: 1 }),
      col.createIndex({ status: 1 }),
      col.createIndex({ 'variants.sku': 1 }, { unique: true, sparse: true }),
    ]);
  }

  static async create(data) {
    const col = await this.collection();
    const now = new Date();
    const design = {
      designID: data.designID || randomUUID(),
      gemstoneId: data.gemstoneId ?? null,   // originating gemstone (flywheel; Pipeline M1-T2/T3)
      dropId: data.dropId ?? null,
      name: data.name ?? '',
      description: data.description ?? null,
      story: data.story ?? '', category: data.category ?? null, attributes: data.attributes ?? {},
      tags: Array.isArray(data.tags) ? data.tags : [], metadata: data.metadata ?? {},
      primaryArtisanId: data.primaryArtisanId ?? null,
      collaborators: Array.isArray(data.collaborators) ? data.collaborators : [],
      edition: data.edition ?? { type: EDITION_TYPE.UNLIMITED, allocated: 0, committed: 0, nextNumber: 1 },
      productionMethod: data.productionMethod ?? PRODUCTION_METHOD.CAD_CAST,
      intake: data.intake ?? {}, cadRevisions: Array.isArray(data.cadRevisions) ? data.cadRevisions : [],
      referenceImages: Array.isArray(data.referenceImages) ? data.referenceImages : [],
      sketches: Array.isArray(data.sketches) ? data.sketches : [],
      stlVolumeCm3: data.stlVolumeCm3 ?? null,
      variants: Array.isArray(data.variants) ? data.variants : [],
      bom: data.bom ?? { castingEstimate: 0, stones: [], findings: [], estMaterialCost: 0 },
      routing: Array.isArray(data.routing) ? data.routing : [],
      estCost: data.estCost ?? null,
      suggestedRetail: data.suggestedRetail ?? null,
      primaryProductId: data.primaryProductId ?? null,
      status: data.status || DESIGN_STATUS.DRAFT,
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy ?? null,
    };
    const validation = validateDesign(design);
    if (!validation.valid) throw new TypeError(validation.errors.join('; '));
    await col.insertOne(design);
    return design;
  }

  static async findById(designID) {
    const col = await this.collection();
    return col.findOne({ designID }, { projection: { _id: 0 } });
  }

  static async list(filter = {}) {
    const col = await this.collection();
    // Scope to production designs (have a designID) so legacy gemstone-cad docs
    // that share this collection never leak into the production catalog.
    return col.find({ designID: { $exists: true }, ...filter }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  }

  static async findByDrop(dropId) {
    const col = await this.collection();
    return col.find({ designID: { $exists: true }, dropId }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  }

  static async updateById(designID, updateData) {
    const col = await this.collection();
    await col.updateOne({ designID }, { $set: { ...updateData, updatedAt: new Date() } });
    return this.findById(designID);
  }

  static ASSET_FIELDS = ['referenceImages', 'sketches'];

  /** Append an uploaded asset URL to one of the design's asset arrays. */
  static async addAsset(designID, field, url) {
    if (!this.ASSET_FIELDS.includes(field)) {
      throw new Error(`Invalid asset field "${field}". Allowed: ${this.ASSET_FIELDS.join(', ')}`);
    }
    const col = await this.collection();
    await col.updateOne({ designID }, { $push: { [field]: url }, $set: { updatedAt: new Date() } });
    return this.findById(designID);
  }
}
