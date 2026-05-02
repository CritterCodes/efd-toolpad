import { db } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';
import {
  PAYROLL_BATCH_STATUS,
  getWeekEndFromStart,
} from '@/services/payrollUtils';

export default class RepairPayrollBatchesModel {
  static COLLECTION = 'repairPayrollBatches';

  static async create(data) {
    const dbInstance = await db.connect();
    const now = new Date();
    const weekStart = new Date(data.weekStart);
    const batch = {
      batchID: data.batchID || `rpay-${uuidv4().slice(0, 8)}`,
      userID: data.userID,
      userName: data.userName || '',
      weekStart,
      weekEnd: data.weekEnd ? new Date(data.weekEnd) : getWeekEndFromStart(weekStart),
      status: data.status || PAYROLL_BATCH_STATUS.DRAFT,
      laborHours: Number(data.laborHours || 0),
      laborPay: Number(data.laborPay || 0),
      repairsWorked: Number(data.repairsWorked || 0),
      entryCount: Number(data.entryCount || 0),
      logIDs: Array.isArray(data.logIDs) ? data.logIDs : [],
      paidAt: data.paidAt || null,
      paymentMethod: data.paymentMethod || '',
      paymentReference: data.paymentReference || '',
      notes: data.notes || '',
      createdBy: data.createdBy || '',
      createdAt: now,
      updatedAt: now,
    };

    await dbInstance.collection(this.COLLECTION).insertOne(batch);
    return batch;
  }

  static async findByBatchID(batchID) {
    const dbInstance = await db.connect();
    const batch = await dbInstance.collection(this.COLLECTION).findOne(
      { batchID },
      { projection: { _id: 0 } }
    );

    if (!batch) {
      throw new Error('Payroll batch not found.');
    }

    return batch;
  }

  static async findOpenByUserWeek({ userID, weekStart }) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION).findOne(
      {
        userID,
        weekStart: new Date(weekStart),
        status: { $ne: PAYROLL_BATCH_STATUS.VOID },
      },
      { projection: { _id: 0 }, sort: { createdAt: -1 } }
    );
  }

  static async list(filter = {}) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION)
      .find(filter)
      .project({ _id: 0 })
      .sort({ weekStart: -1, createdAt: -1 })
      .toArray();
  }

  static async updateByBatchID(batchID, updateData) {
    const dbInstance = await db.connect();
    const result = await dbInstance.collection(this.COLLECTION).updateOne(
      { batchID },
      { $set: { ...updateData, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      throw new Error('Payroll batch not found.');
    }

    return await this.findByBatchID(batchID);
  }

  static async deleteByBatchID(batchID) {
    const dbInstance = await db.connect();
    await dbInstance.collection(this.COLLECTION).deleteOne({ batchID });
  }
}
