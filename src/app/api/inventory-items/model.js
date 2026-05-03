import { db } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';
import { roundInventoryQuantity, INVENTORY_DEFAULT_UNIT } from '@/services/inventory';

export default class InventoryItemsModel {
  static COLLECTION = 'inventory';

  static async create(data) {
    const dbInstance = await db.connect();
    const now = new Date();
    const item = {
      inventoryItemID: data.inventoryItemID || `inv-${uuidv4().slice(0, 8)}`,
      name: (data.name || '').trim(),
      category: (data.category || '').trim() || 'General',
      unitOfMeasure: (data.unitOfMeasure || INVENTORY_DEFAULT_UNIT).trim(),
      onHand: roundInventoryQuantity(data.onHand || 0),
      reorderPoint: roundInventoryQuantity(data.reorderPoint || 0),
      reorderQuantity: roundInventoryQuantity(data.reorderQuantity || 0),
      preferredVendor: (data.preferredVendor || '').trim(),
      vendorSku: (data.vendorSku || '').trim(),
      linkedMaterialID: data.linkedMaterialID || '',
      active: data.active !== false,
      location: (data.location || '').trim(),
      notes: data.notes || '',
      stullerItemNumber: (data.stullerItemNumber || '').trim(),
      stullerDescription: data.stullerDescription || '',
      lastVendorCost: Number(data.lastVendorCost || 0),
      lastReceivedAt: data.lastReceivedAt ? new Date(data.lastReceivedAt) : null,
      createdBy: data.createdBy || '',
      createdAt: now,
      updatedAt: now,
    };

    await dbInstance.collection(this.COLLECTION).insertOne(item);
    return item;
  }

  static async list(filter = {}) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION)
      .find(filter)
      .project({ _id: 0 })
      .sort({ active: -1, category: 1, name: 1 })
      .toArray();
  }

  static async findByInventoryItemID(inventoryItemID) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION).findOne(
      { inventoryItemID },
      { projection: { _id: 0 } }
    );
  }

  static async updateByInventoryItemID(inventoryItemID, updateData) {
    const dbInstance = await db.connect();
    const patch = Object.fromEntries(
      Object.entries({
        ...updateData,
        onHand: updateData.onHand != null ? roundInventoryQuantity(updateData.onHand) : undefined,
        reorderPoint: updateData.reorderPoint != null ? roundInventoryQuantity(updateData.reorderPoint) : undefined,
        reorderQuantity: updateData.reorderQuantity != null ? roundInventoryQuantity(updateData.reorderQuantity) : undefined,
        lastReceivedAt: updateData.lastReceivedAt ? new Date(updateData.lastReceivedAt) : updateData.lastReceivedAt,
        updatedAt: new Date(),
      }).filter(([, value]) => value !== undefined)
    );

    const result = await dbInstance.collection(this.COLLECTION).updateOne(
      { inventoryItemID },
      { $set: patch }
    );

    if (result.matchedCount === 0) {
      throw new Error('Inventory item not found.');
    }

    return await this.findByInventoryItemID(inventoryItemID);
  }

  static async deleteByInventoryItemID(inventoryItemID) {
    const dbInstance = await db.connect();
    const result = await dbInstance.collection(this.COLLECTION).deleteOne({ inventoryItemID });
    if (result.deletedCount === 0) {
      throw new Error('Inventory item not found.');
    }
  }
}
