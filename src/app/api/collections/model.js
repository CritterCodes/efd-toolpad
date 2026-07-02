import { db } from '@/lib/database';
import { randomUUID } from 'crypto';
import Constants from '@/lib/constants';
import { COLLECTION_STATUS, OWNER_TYPE } from '@/services/production/collectionsUnify';

/**
 * Unified Collection ≡ Drop (Pipeline M1-T5). One `collections` collection holds both
 * house (EFD) drops and artisan collections; a "drop" is a Collection with a release
 * facet (`status`, `releaseAt`). Members are Products (any productType). See
 * docs/manufacturing/data-model.md + collection-page-data-contract.md.
 *
 * NOTE: the legacy `/api/collections/*` routes still read/write this collection with a
 * `_id`/`products[]`/`type` shape; the `pp1-collections-unify` migration normalizes
 * existing docs onto this shape (collectionId/ownerType/status/members[]). Route
 * convergence onto this model is in progress.
 */
export { COLLECTION_STATUS, OWNER_TYPE };

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'collection';
}

export default class CollectionsModel {
  static COLLECTION = Constants.COLLECTIONS_COLLECTION;

  static async collection() {
    const dbInstance = await db.connect();
    return dbInstance.collection(this.COLLECTION);
  }

  static async ensureIndexes() {
    const col = await this.collection();
    await Promise.all([
      col.createIndex({ collectionId: 1 }, { unique: true, sparse: true }),
      col.createIndex({ slug: 1 }),
      col.createIndex({ status: 1 }),
      col.createIndex({ ownerType: 1 }),
    ]);
  }

  static async create(data) {
    const col = await this.collection();
    const now = new Date();
    const doc = {
      collectionId: data.collectionId || randomUUID(),
      name: data.name ?? '',
      slug: data.slug || slugify(data.name),
      theme: data.theme ?? null,
      description: data.description ?? '',
      ownerType: data.ownerType || OWNER_TYPE.EFD,
      ownerId: data.ownerId ?? null,
      ownerInfo: data.ownerInfo ?? null,
      channel: data.channel ?? null,
      status: data.status || COLLECTION_STATUS.DRAFT,
      releaseAt: data.releaseAt ?? null,
      members: Array.isArray(data.members) ? data.members : [],
      image: data.image ?? null,
      thumbnail: data.thumbnail ?? null,
      seo: data.seo ?? {},
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy ?? null,
    };
    await col.insertOne(doc);
    return doc;
  }

  static async findById(collectionId) {
    const col = await this.collection();
    return col.findOne({ collectionId }, { projection: { _id: 0 } });
  }

  static async findBySlug(slug) {
    const col = await this.collection();
    return col.findOne({ slug }, { projection: { _id: 0 } });
  }

  static async list(filter = {}) {
    const col = await this.collection();
    return col.find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  }

  static async updateById(collectionId, updateData) {
    const col = await this.collection();
    await col.updateOne({ collectionId }, { $set: { ...updateData, updatedAt: new Date() } });
    return this.findById(collectionId);
  }

  /** Add a product member (idempotent by productId; position defaults to append). */
  static async addMember(collectionId, member) {
    const col = await this.collection();
    const doc = await this.findById(collectionId);
    if (!doc) return null;
    if ((doc.members || []).some((m) => m.productId === member.productId)) return doc; // no dup
    const position = member.position ?? (doc.members?.length ?? 0);
    await col.updateOne(
      { collectionId },
      { $push: { members: { productId: member.productId, position, notes: member.notes ?? '', addedAt: new Date() } }, $set: { updatedAt: new Date() } },
    );
    return this.findById(collectionId);
  }

  static async removeMember(collectionId, productId) {
    const col = await this.collection();
    await col.updateOne(
      { collectionId },
      { $pull: { members: { productId } }, $set: { updatedAt: new Date() } },
    );
    return this.findById(collectionId);
  }
}
