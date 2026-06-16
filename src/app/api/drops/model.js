import { db } from '@/lib/database';
import { randomUUID } from 'crypto';
import Constants from '@/lib/constants';

export const DROP_STATUS = {
  PLANNING: 'planning',
  IN_PRODUCTION: 'in_production',
  RELEASED: 'released',
  ARCHIVED: 'archived',
};

export const DROP_CHANNEL = {
  SHOWCASE: 'showcase',
  SHOW: 'show',
  ONLINE: 'online',
  WHOLESALE: 'wholesale',
};

/** A production release/collection that groups designs. See docs/manufacturing/data-model.md. */
export default class DropsModel {
  static COLLECTION = Constants.DROPS_COLLECTION;

  static async collection() {
    const dbInstance = await db.connect();
    return dbInstance.collection(this.COLLECTION);
  }

  static async ensureIndexes() {
    const col = await this.collection();
    await Promise.all([
      col.createIndex({ dropID: 1 }, { unique: true }),
      col.createIndex({ status: 1 }),
    ]);
  }

  static async create(data) {
    const col = await this.collection();
    const now = new Date();
    const drop = {
      dropID: data.dropID || randomUUID(),
      name: data.name ?? '',
      slug: data.slug ?? null,
      theme: data.theme ?? null,
      description: data.description ?? null,
      channel: data.channel || DROP_CHANNEL.SHOWCASE,
      status: data.status || DROP_STATUS.PLANNING,
      targetReleaseDate: data.targetReleaseDate ?? null,
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy ?? null,
    };
    await col.insertOne(drop);
    return drop;
  }

  static async findById(dropID) {
    const col = await this.collection();
    return col.findOne({ dropID }, { projection: { _id: 0 } });
  }

  static async list(filter = {}) {
    const col = await this.collection();
    return col.find(filter, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  }

  static async updateById(dropID, updateData) {
    const col = await this.collection();
    await col.updateOne({ dropID }, { $set: { ...updateData, updatedAt: new Date() } });
    return this.findById(dropID);
  }
}
