import { db } from '@/lib/database';
import { randomUUID } from 'crypto';
import Constants from '@/lib/constants';

export const DROP_STATUS = Object.freeze({ DRAFT: 'draft', SCHEDULED: 'scheduled', RELEASED: 'released', ARCHIVED: 'archived' });
export const DROP_OWNER_TYPE = Object.freeze({ EFD: 'efd', ARTISAN: 'artisan' });
export const DROP_CHANNELS = Object.freeze(['showcase', 'show', 'online', 'wholesale']);

export function validateDrop(data = {}) {
  const errors = [];
  if (!data.name?.trim()) errors.push('name is required');
  if (!data.slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug)) errors.push('slug must be URL-safe');
  if (!Object.values(DROP_OWNER_TYPE).includes(data.ownerType)) errors.push('ownerType must be efd or artisan');
  if (data.ownerType === DROP_OWNER_TYPE.ARTISAN && !data.ownerId) errors.push('ownerId is required for artisan drops');
  if (!Object.values(DROP_STATUS).includes(data.status)) errors.push('invalid drop status');
  if (data.status === DROP_STATUS.SCHEDULED && !data.releaseAt) errors.push('releaseAt is required when scheduled');
  if ((data.channels || []).some((channel) => !DROP_CHANNELS.includes(channel))) errors.push('invalid channel');
  const order = data.designOrder || [];
  if (new Set(order).size !== order.length) errors.push('designOrder cannot contain duplicates');
  return { valid: errors.length === 0, errors };
}

export default class DropsModel {
  static COLLECTION = Constants.DROPS_COLLECTION;
  static async collection() { return (await db.connect()).collection(this.COLLECTION); }

  static async ensureIndexes() {
    const col = await this.collection();
    await Promise.all([
      col.createIndex({ dropId: 1 }, { unique: true }),
      col.createIndex({ slug: 1 }, { unique: true }),
      col.createIndex({ ownerType: 1, ownerId: 1 }),
      col.createIndex({ status: 1, releaseAt: 1 }),
    ]);
  }

  static async create(data) {
    const now = new Date();
    const drop = {
      dropId: data.dropId || randomUUID(), slug: data.slug, name: data.name,
      description: data.description ?? '', ownerType: data.ownerType ?? DROP_OWNER_TYPE.EFD,
      ownerId: data.ownerId ?? null, ownerInfo: data.ownerInfo ?? null,
      // Collaborative artisans (userIDs) — they can see the drop and add THEIR designs to it.
      // Control (name/slug/curation) stays with the owner; releasing stays with EFD staff.
      collaborators: Array.isArray(data.collaborators) ? data.collaborators : [],
      channels: Array.isArray(data.channels) ? data.channels : [], status: data.status ?? DROP_STATUS.DRAFT,
      releaseAt: data.releaseAt ?? null, releasedAt: data.releasedAt ?? null,
      designOrder: Array.isArray(data.designOrder) ? data.designOrder : [], heroImage: data.heroImage ?? null,
      thumbnail: data.thumbnail ?? null, seo: data.seo ?? {}, createdAt: now, updatedAt: now,
      createdBy: data.createdBy ?? null,
    };
    const validation = validateDrop(drop);
    if (!validation.valid) throw new TypeError(validation.errors.join('; '));
    await (await this.collection()).insertOne(drop);
    return drop;
  }

  static async findById(dropId) { return (await this.collection()).findOne({ dropId }, { projection: { _id: 0 } }); }
  static async list(filter = {}) { return (await this.collection()).find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray(); }
  static async updateById(dropId, updateData) {
    const current = await this.findById(dropId);
    if (!current) return null;
    const next = { ...current, ...updateData };
    const validation = validateDrop(next);
    if (!validation.valid) throw new TypeError(validation.errors.join('; '));
    await (await this.collection()).updateOne({ dropId }, { $set: { ...updateData, updatedAt: new Date() } });
    return this.findById(dropId);
  }
}
