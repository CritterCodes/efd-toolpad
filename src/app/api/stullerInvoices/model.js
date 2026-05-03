import { db } from '@/lib/database';

export default class StullerInvoicesModel {
  static COLLECTION = 'stullerInvoices';

  static async upsert(invoice) {
    const dbInstance = await db.connect();
    const document = {
      ...invoice,
      lastSyncedAt: new Date(),
      updatedAt: new Date(),
    };
    await dbInstance.collection(this.COLLECTION).updateOne(
      { stullerInvoiceID: document.stullerInvoiceID },
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
      .sort({ invoiceDate: -1, updatedAt: -1 })
      .toArray();
  }

  static async findByID(stullerInvoiceID) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION).findOne(
      { stullerInvoiceID },
      { projection: { _id: 0 } }
    );
  }
}
