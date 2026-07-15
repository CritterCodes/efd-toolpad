import { db } from '@/lib/database';
import { randomUUID } from 'crypto';
import Constants from '@/lib/constants';

export const COLLECTION_STATUS = Object.freeze({ DRAFT: 'draft', PUBLISHED: 'published', ARCHIVED: 'archived' });
export const COLLECTION_OPERATORS = Object.freeze(['eq', 'not_eq', 'in', 'not_in', 'contains', 'not_contains', 'gte', 'lte', 'between', 'exists']);
export const COLLECTION_RULE_FIELDS = Object.freeze([
  'productType', 'jewelry.category', 'primaryArtisanId', 'collaborators', 'dropId', 'edition.type',
  'offers', 'customizerEnabled', 'variants.metal', 'variants.karat', 'variants.finish', 'retailPrice',
  'status', 'channels', 'tags', 'metadata',
]);

function validateRule(node, errors, path = 'rules') {
  if (!node || typeof node !== 'object') return errors.push(`${path} must be an object`);
  if (Object.keys(node).length === 0) return;
  const group = node.all || node.any;
  if (group) {
    if (!Array.isArray(group) || group.length === 0) errors.push(`${path} group must not be empty`);
    else group.forEach((child, index) => validateRule(child, errors, `${path}[${index}]`));
    return;
  }
  if (!COLLECTION_RULE_FIELDS.includes(node.field)) errors.push(`${path}.field is not registered`);
  if (!COLLECTION_OPERATORS.includes(node.operator)) errors.push(`${path}.operator is invalid`);
  if (node.operator !== 'exists' && node.value === undefined) errors.push(`${path}.value is required`);
}

export function validateCollection(data = {}) {
  const errors = [];
  if (!data.name?.trim()) errors.push('name is required');
  if (!data.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) errors.push('slug must be URL-safe');
  if (!Object.values(COLLECTION_STATUS).includes(data.status)) errors.push('invalid collection status');
  validateRule(data.rules, errors);
  const pinnedPositions = (data.pinned || []).map((item) => item.position);
  if (new Set(pinnedPositions).size !== pinnedPositions.length) errors.push('pinned positions must be unique');
  return { valid: errors.length === 0, errors };
}

export default class CollectionsModel {
  static COLLECTION = Constants.COLLECTIONS_COLLECTION;
  static async collection() { return (await db.connect()).collection(this.COLLECTION); }
  static async ensureIndexes() {
    const col = await this.collection();
    await Promise.all([
      col.createIndex({ collectionId: 1 }, { unique: true }),
      col.createIndex({ slug: 1 }, { unique: true }),
      col.createIndex({ status: 1 }),
    ]);
  }
  static async create(data) {
    const now = new Date();
    const doc = {
      collectionId: data.collectionId || randomUUID(), slug: data.slug, name: data.name,
      description: data.description ?? '', status: data.status ?? COLLECTION_STATUS.DRAFT,
      rules: data.rules ?? {}, manualIncludes: [...new Set(data.manualIncludes || [])],
      manualExcludes: [...new Set(data.manualExcludes || [])], pinned: data.pinned ?? [],
      media: data.media ?? {}, seo: data.seo ?? {}, createdAt: now, updatedAt: now, createdBy: data.createdBy ?? null,
    };
    const validation = validateCollection(doc);
    if (!validation.valid) throw new TypeError(validation.errors.join('; '));
    await (await this.collection()).insertOne(doc);
    return doc;
  }
  static async findById(collectionId) { return (await this.collection()).findOne({ collectionId }, { projection: { _id: 0 } }); }
  static async findBySlug(slug) { return (await this.collection()).findOne({ slug }, { projection: { _id: 0 } }); }
  static async list(filter = {}) { return (await this.collection()).find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray(); }
}
