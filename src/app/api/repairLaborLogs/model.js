import { db } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';
import {
  PAYROLL_LOG_STATUS,
  buildPayrollBatchTotals,
  getMondayOfWeek,
  normalizePayrollLogStatus,
} from '@/services/payrollUtils';

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
      notes: data.notes || '',
      weekStart: getMondayOfWeek(now),
      payrollBatchID: data.payrollBatchID || '',
      payrollStatus: normalizePayrollLogStatus(data.payrollStatus),
      payrolledAt: data.payrolledAt || null,
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

  static async findLatestByRepair(repairID) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION)
      .find({ repairID })
      .project({ _id: 0 })
      .sort({ createdAt: -1 })
      .limit(1)
      .next();
  }

  static async findByLogID(logID) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION)
      .findOne({ logID }, { projection: { _id: 0 } });
  }

  static async findPendingReview() {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION).aggregate([
      {
        $match: {
          requiresAdminReview: true,
          adminReviewedAt: null,
        },
      },
      {
        $lookup: {
          from: 'repairs',
          localField: 'repairID',
          foreignField: 'repairID',
          as: 'repair',
        },
      },
      { $unwind: { path: '$repair', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          logID: 1,
          repairID: 1,
          primaryJewelerUserID: 1,
          primaryJewelerName: 1,
          creditedLaborHours: 1,
          laborRateSnapshot: 1,
          creditedValue: 1,
          sourceAction: 1,
          requiresAdminReview: 1,
          adminReviewedBy: 1,
          adminReviewedAt: 1,
          notes: 1,
          weekStart: 1,
          payrollBatchID: 1,
          payrollStatus: 1,
          payrolledAt: 1,
          createdAt: 1,
          updatedAt: 1,
          repair: {
            repairID: '$repair.repairID',
            clientName: '$repair.clientName',
            businessName: '$repair.businessName',
            description: '$repair.description',
            status: '$repair.status',
            picture: '$repair.picture',
            tasks: '$repair.tasks',
            processes: '$repair.processes',
            materials: '$repair.materials',
            customLineItems: '$repair.customLineItems',
            totalCost: '$repair.totalCost',
            subtotal: '$repair.subtotal',
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ]).toArray();
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

  static async weeklyBreakdown({ weekStart, userID } = {}) {
    if (!weekStart || !userID) {
      throw new Error('weekStart and userID are required for a labor breakdown.');
    }

    const dbInstance = await db.connect();
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    const logs = await dbInstance.collection(this.COLLECTION).aggregate([
      {
        $match: {
          requiresAdminReview: false,
          primaryJewelerUserID: userID,
          weekStart: { $gte: start, $lt: end },
        },
      },
      {
        $lookup: {
          from: 'repairs',
          localField: 'repairID',
          foreignField: 'repairID',
          as: 'repair',
        },
      },
      { $unwind: { path: '$repair', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          logID: 1,
          repairID: 1,
          primaryJewelerUserID: 1,
          primaryJewelerName: 1,
          creditedLaborHours: 1,
          laborRateSnapshot: 1,
          creditedValue: 1,
          sourceAction: 1,
          notes: 1,
          weekStart: 1,
          createdAt: 1,
          updatedAt: 1,
          repair: {
            repairID: '$repair.repairID',
            clientName: '$repair.clientName',
            businessName: '$repair.businessName',
            description: '$repair.description',
            status: '$repair.status',
            picture: '$repair.picture',
            tasks: '$repair.tasks',
            processes: '$repair.processes',
            materials: '$repair.materials',
            customLineItems: '$repair.customLineItems',
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ]).toArray();

    const repairIDs = new Set(logs.map((log) => log.repairID).filter(Boolean));
    return {
      userID,
      userName: logs[0]?.primaryJewelerName || '',
      weekStart: start,
      repairsWorked: repairIDs.size,
      entries: logs.length,
      laborHours: logs.reduce((sum, log) => sum + Number(log.creditedLaborHours || 0), 0),
      laborPay: logs.reduce((sum, log) => sum + Number(log.creditedValue || 0), 0),
      logs,
    };
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

  static buildUnbatchedMatch({ weekStart, weekEnd, userID } = {}) {
    const match = {
      requiresAdminReview: false,
      $or: [
        { payrollStatus: { $exists: false } },
        { payrollStatus: PAYROLL_LOG_STATUS.UNBATCHED },
        { payrollStatus: '' },
      ],
    };

    if (weekStart || weekEnd) {
      match.weekStart = {};
      if (weekStart) match.weekStart.$gte = new Date(weekStart);
      if (weekEnd) match.weekStart.$lte = new Date(weekEnd);
    }

    if (userID) {
      match.primaryJewelerUserID = userID;
    }

    return match;
  }

  static async listPayrollCandidates({ weekStart, weekEnd, userID } = {}) {
    const dbInstance = await db.connect();
    const match = this.buildUnbatchedMatch({ weekStart, weekEnd, userID });

    return await dbInstance.collection(this.COLLECTION).aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            userID: '$primaryJewelerUserID',
            userName: '$primaryJewelerName',
            weekStart: '$weekStart',
          },
          logIDs: { $addToSet: '$logID' },
          repairIDs: { $addToSet: '$repairID' },
          laborHours: { $sum: '$creditedLaborHours' },
          laborPay: { $sum: '$creditedValue' },
          entryCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          userID: '$_id.userID',
          userName: '$_id.userName',
          weekStart: '$_id.weekStart',
          logIDs: 1,
          repairsWorked: { $size: '$repairIDs' },
          laborHours: 1,
          laborPay: 1,
          entryCount: 1,
        },
      },
      { $sort: { weekStart: -1, userName: 1 } },
    ]).toArray();
  }

  static async payrollCandidateBreakdown({ weekStart, userID } = {}) {
    if (!weekStart || !userID) {
      throw new Error('weekStart and userID are required for a payroll candidate breakdown.');
    }

    const dbInstance = await db.connect();
    const start = new Date(weekStart);
    const logs = await dbInstance.collection(this.COLLECTION).aggregate([
      {
        $match: this.buildUnbatchedMatch({
          weekStart: start,
          weekEnd: start,
          userID,
        }),
      },
      {
        $lookup: {
          from: 'repairs',
          localField: 'repairID',
          foreignField: 'repairID',
          as: 'repair',
        },
      },
      { $unwind: { path: '$repair', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          logID: 1,
          repairID: 1,
          primaryJewelerUserID: 1,
          primaryJewelerName: 1,
          creditedLaborHours: 1,
          laborRateSnapshot: 1,
          creditedValue: 1,
          sourceAction: 1,
          notes: 1,
          weekStart: 1,
          payrollBatchID: 1,
          payrollStatus: 1,
          payrolledAt: 1,
          createdAt: 1,
          updatedAt: 1,
          repair: {
            repairID: '$repair.repairID',
            clientName: '$repair.clientName',
            businessName: '$repair.businessName',
            description: '$repair.description',
            status: '$repair.status',
            picture: '$repair.picture',
            tasks: '$repair.tasks',
            processes: '$repair.processes',
            materials: '$repair.materials',
            customLineItems: '$repair.customLineItems',
            totalCost: '$repair.totalCost',
            subtotal: '$repair.subtotal',
          },
        },
      },
      { $sort: { createdAt: -1 } },
    ]).toArray();

    const totals = buildPayrollBatchTotals(logs);
    return {
      userID,
      userName: logs[0]?.primaryJewelerName || '',
      weekStart: start,
      ...totals,
      logIDs: logs.map((log) => log.logID),
      logs,
    };
  }

  static async assignToPayrollBatch(logIDs = [], batchID = '') {
    if (!Array.isArray(logIDs) || logIDs.length === 0) {
      return 0;
    }

    const dbInstance = await db.connect();
    const result = await dbInstance.collection(this.COLLECTION).updateMany(
      {
        logID: { $in: logIDs },
        requiresAdminReview: false,
        $or: [
          { payrollStatus: { $exists: false } },
          { payrollStatus: PAYROLL_LOG_STATUS.UNBATCHED },
          { payrollStatus: '' },
        ],
      },
      {
        $set: {
          payrollBatchID: batchID,
          payrollStatus: PAYROLL_LOG_STATUS.BATCHED,
          updatedAt: new Date(),
        },
      }
    );

    return result.modifiedCount;
  }

  static async markBatchPaid(batchID, paidAt = new Date()) {
    const dbInstance = await db.connect();
    await dbInstance.collection(this.COLLECTION).updateMany(
      { payrollBatchID: batchID },
      {
        $set: {
          payrollStatus: PAYROLL_LOG_STATUS.PAID,
          payrolledAt: paidAt,
          updatedAt: new Date(),
        },
      }
    );
  }

  static async releasePayrollBatch(batchID) {
    const dbInstance = await db.connect();
    await dbInstance.collection(this.COLLECTION).updateMany(
      { payrollBatchID: batchID },
      {
        $set: {
          payrollBatchID: '',
          payrollStatus: PAYROLL_LOG_STATUS.UNBATCHED,
          payrolledAt: null,
          updatedAt: new Date(),
        },
      }
    );
  }

  static async getDiagnostics({ weekStart } = {}) {
    const dbInstance = await db.connect();
    const logMatch = {};
    let weekWindow = null;

    if (weekStart) {
      const start = new Date(weekStart);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      weekWindow = { start, end };
      logMatch.weekStart = { $gte: start, $lt: end };
    }

    const [countsByWeek, reviewedSummary, payrollSummary, missingQcLogs] = await Promise.all([
      dbInstance.collection(this.COLLECTION).aggregate([
        { $match: logMatch },
        {
          $group: {
            _id: '$weekStart',
            count: { $sum: 1 },
          },
        },
        { $project: { _id: 0, weekStart: '$_id', count: 1 } },
        { $sort: { weekStart: -1 } },
      ]).toArray(),
      dbInstance.collection(this.COLLECTION).aggregate([
        { $match: logMatch },
        {
          $group: {
            _id: '$requiresAdminReview',
            count: { $sum: 1 },
          },
        },
      ]).toArray(),
      dbInstance.collection(this.COLLECTION).aggregate([
        { $match: logMatch },
        {
          $group: {
            _id: {
              $ifNull: ['$payrollStatus', PAYROLL_LOG_STATUS.UNBATCHED],
            },
            count: { $sum: 1 },
          },
        },
      ]).toArray(),
      dbInstance.collection('repairs').aggregate([
        {
          $match: weekWindow
            ? {
                completedAt: { $gte: weekWindow.start, $lt: weekWindow.end },
              }
            : {
                completedAt: { $exists: true, $ne: null },
              },
        },
        {
          $lookup: {
            from: this.COLLECTION,
            localField: 'repairID',
            foreignField: 'repairID',
            as: 'laborLogs',
          },
        },
        {
          $match: {
            laborLogs: { $size: 0 },
          },
        },
        {
          $project: {
            _id: 0,
            repairID: 1,
            clientName: 1,
            businessName: 1,
            status: 1,
            completedAt: 1,
          },
        },
        { $sort: { completedAt: -1 } },
      ]).toArray(),
    ]);

    return {
      countsByWeek,
      reviewedSummary,
      payrollSummary,
      repairsSentToQcWithoutLogs: missingQcLogs,
    };
  }
}
