import { db } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';
import { normalizeReorderStatus } from '@/services/inventory';

export default class InventoryReorderSuggestionsModel {
  static COLLECTION = 'inventoryReorderSuggestions';

  static async create(data) {
    const dbInstance = await db.connect();
    const now = new Date();
    const suggestion = {
      suggestionID: data.suggestionID || `invsug-${uuidv4().slice(0, 8)}`,
      inventoryItemID: data.inventoryItemID,
      suggestedQty: Number(data.suggestedQty || 0),
      reason: data.reason || '',
      status: normalizeReorderStatus(data.status),
      vendorSnapshot: data.vendorSnapshot || null,
      createdBy: data.createdBy || '',
      createdAt: now,
      updatedAt: now,
    };

    await dbInstance.collection(this.COLLECTION).insertOne(suggestion);
    return suggestion;
  }

  static async list(filter = {}) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION)
      .find(filter)
      .project({ _id: 0 })
      .sort({ status: 1, createdAt: -1 })
      .toArray();
  }

  static async findOpenByInventoryItemID(inventoryItemID) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION).findOne(
      { inventoryItemID, status: 'open' },
      { projection: { _id: 0 }, sort: { createdAt: -1 } }
    );
  }

  static async updateBySuggestionID(suggestionID, updateData) {
    const dbInstance = await db.connect();
    const result = await dbInstance.collection(this.COLLECTION).updateOne(
      { suggestionID },
      { $set: { ...updateData, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      throw new Error('Inventory reorder suggestion not found.');
    }

    return await dbInstance.collection(this.COLLECTION).findOne(
      { suggestionID },
      { projection: { _id: 0 } }
    );
  }
}
