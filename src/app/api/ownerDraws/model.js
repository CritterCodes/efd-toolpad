import { db } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';
import { OWNER_DRAW_STATUS } from '@/services/payrollUtils';

export default class OwnerDrawsModel {
  static COLLECTION = 'ownerDraws';

  static async create(data) {
    const dbInstance = await db.connect();
    const now = new Date();
    const entry = {
      drawID: data.drawID || `odraw-${uuidv4().slice(0, 8)}`,
      userID: data.userID,
      userName: data.userName || '',
      amount: Number(data.amount || 0),
      drawDate: data.drawDate ? new Date(data.drawDate) : now,
      paymentMethod: data.paymentMethod || '',
      paymentReference: data.paymentReference || '',
      notes: data.notes || '',
      status: data.status || OWNER_DRAW_STATUS.RECORDED,
      createdBy: data.createdBy || '',
      createdAt: now,
      updatedAt: now,
    };

    await dbInstance.collection(this.COLLECTION).insertOne(entry);
    return entry;
  }

  static async findByDrawID(drawID) {
    const dbInstance = await db.connect();
    const draw = await dbInstance.collection(this.COLLECTION).findOne(
      { drawID },
      { projection: { _id: 0 } }
    );

    if (!draw) {
      throw new Error('Owner draw not found.');
    }

    return draw;
  }

  static async list(filter = {}) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION)
      .find(filter)
      .project({ _id: 0 })
      .sort({ drawDate: -1, createdAt: -1 })
      .toArray();
  }

  static async updateByDrawID(drawID, updateData) {
    const dbInstance = await db.connect();
    const result = await dbInstance.collection(this.COLLECTION).updateOne(
      { drawID },
      { $set: { ...updateData, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      throw new Error('Owner draw not found.');
    }

    return await this.findByDrawID(drawID);
  }
}
