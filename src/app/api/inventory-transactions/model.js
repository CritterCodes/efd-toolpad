import { db } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';
import {
  normalizeInventorySourceType,
  normalizeInventoryTransactionType,
  roundInventoryQuantity,
} from '@/services/inventory';

export default class InventoryTransactionsModel {
  static COLLECTION = 'inventoryTransactions';

  static async create(data) {
    const dbInstance = await db.connect();
    const now = new Date();
    const transaction = {
      transactionID: data.transactionID || `invtx-${uuidv4().slice(0, 8)}`,
      inventoryItemID: data.inventoryItemID,
      quantityDelta: roundInventoryQuantity(data.quantityDelta || 0),
      transactionType: normalizeInventoryTransactionType(data.transactionType),
      effectiveDate: data.effectiveDate ? new Date(data.effectiveDate) : now,
      sourceType: normalizeInventorySourceType(data.sourceType),
      sourceReferenceID: data.sourceReferenceID || '',
      sourceLineReference: data.sourceLineReference || '',
      notes: data.notes || '',
      unitCost: Number(data.unitCost || 0),
      createdBy: data.createdBy || '',
      createdAt: now,
    };

    await dbInstance.collection(this.COLLECTION).insertOne(transaction);
    return transaction;
  }

  static async list(filter = {}) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION)
      .find(filter)
      .project({ _id: 0 })
      .sort({ effectiveDate: -1, createdAt: -1 })
      .toArray();
  }

  static async findBySourceReference({ sourceType, sourceReferenceID, sourceLineReference = '', transactionType = '' }) {
    const dbInstance = await db.connect();
    const query = {
      sourceType: normalizeInventorySourceType(sourceType),
      sourceReferenceID: sourceReferenceID || '',
      sourceLineReference: sourceLineReference || '',
    };

    if (transactionType) {
      query.transactionType = normalizeInventoryTransactionType(transactionType);
    }

    return await dbInstance.collection(this.COLLECTION).findOne(
      query,
      { projection: { _id: 0 } }
    );
  }

  static async countForInventoryItem(inventoryItemID) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION).countDocuments({ inventoryItemID });
  }
}
