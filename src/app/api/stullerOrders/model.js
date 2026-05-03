import { db } from '@/lib/database';

export default class StullerOrdersModel {
  static COLLECTION = 'stullerOrders';

  static async upsert(order) {
    const dbInstance = await db.connect();
    const document = {
      ...order,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    };
    await dbInstance.collection(this.COLLECTION).updateOne(
      { stullerOrderID: document.stullerOrderID },
      {
        $set: document,
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );
    return document;
  }

  static async list(filter = {}) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION)
      .find(filter)
      .project({ _id: 0 })
      .sort({ orderDate: -1, updatedAt: -1 })
      .toArray();
  }

  static async findByID(stullerOrderID) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION).findOne(
      { stullerOrderID },
      { projection: { _id: 0 } }
    );
  }
}
