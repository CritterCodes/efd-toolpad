import { db } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';

function getMondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default class RepairLaborLogsModel {
  static COLLECTION = 'repairLaborLogs';

  static async create(data) {
    const dbInstance = await db.connect();
    const now = new Date();
    const entry = {
      logID: uuidv4(),
      repairID: data.repairID,
      primaryJewelerUserID: data.primaryJewelerUserID,
      primaryJewelerName: data.primaryJewelerName,
      creditedLaborHours: data.creditedLaborHours ?? 0,
      laborRateSnapshot: data.laborRateSnapshot ?? 0,
      creditedValue: (data.creditedLaborHours ?? 0) * (data.laborRateSnapshot ?? 0),
      sourceAction: data.sourceAction,
      requiresAdminReview: data.requiresAdminReview ?? false,
      adminReviewedBy: '',
      adminReviewedAt: null,
      notes: '',
      weekStart: getMondayOfWeek(now),
      createdAt: now,
      updatedAt: now,
    };
    await dbInstance.collection(this.COLLECTION).insertOne(entry);
    return entry;
  }

  static async findByRepair(repairID) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION)
      .find({ repairID })
      .project({ _id: 0 })
      .sort({ createdAt: -1 })
      .toArray();
  }

  static async findByLogID(logID) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION)
      .findOne({ logID }, { projection: { _id: 0 } });
  }

  static async findPendingReview() {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION)
      .find({ requiresAdminReview: true, adminReviewedAt: null })
      .project({ _id: 0 })
      .sort({ createdAt: -1 })
      .toArray();
  }

  /** Weekly payroll aggregation for all jewelers or a specific one */
  static async weeklyReport({ weekStart, weekEnd, userID } = {}) {
    const dbInstance = await db.connect();
    const match = { requiresAdminReview: false };
    if (weekStart) match.weekStart = { $gte: new Date(weekStart) };
    if (weekEnd) match.weekStart = { ...match.weekStart, $lte: new Date(weekEnd) };
    if (userID) match.primaryJewelerUserID = userID;

    return await dbInstance.collection(this.COLLECTION).aggregate([
      { $match: match },
      {
        $group: {
          _id: { userID: '$primaryJewelerUserID', weekStart: '$weekStart' },
          userName: { $first: '$primaryJewelerName' },
          repairIDs: { $addToSet: '$repairID' },
          laborHours: { $sum: '$creditedLaborHours' },
          laborPay: { $sum: '$creditedValue' },
          entries: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          userID: '$_id.userID',
          weekStart: '$_id.weekStart',
          userName: 1,
          repairsWorked: { $size: '$repairIDs' },
          laborHours: 1,
          laborPay: 1,
          entries: 1,
        },
      },
      { $sort: { weekStart: -1, userName: 1 } },
    ]).toArray();
  }

  static async updateById(logID, updateData) {
    const dbInstance = await db.connect();
    await dbInstance.collection(this.COLLECTION).updateOne(
      { logID },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
    return await dbInstance.collection(this.COLLECTION)
      .findOne({ logID }, { projection: { _id: 0 } });
  }
}
