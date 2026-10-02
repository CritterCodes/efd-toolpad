/**
 * Labor-log reports (RepairLaborLogsModel delegates here): the weekly payroll aggregation, one jeweler's week, and the diagnostics. Moved verbatim from model.js (max-lines, 2026-10-01).
 */
import { db } from '@/lib/database';
import { PAYROLL_LOG_STATUS } from '@/services/payrollUtils';
import { LABOR_LOGS } from './collection';

/** Weekly payroll aggregation for all jewelers or a specific one */
export async function weeklyReport({ weekStart, weekEnd, userID } = {}) {
  const dbInstance = await db.connect();
  const match = { requiresAdminReview: false };
  if (weekStart) match.weekStart = { $gte: new Date(weekStart) };
  if (weekEnd) match.weekStart = { ...match.weekStart, $lte: new Date(weekEnd) };
  if (userID) match.primaryJewelerUserID = userID;

  return await dbInstance.collection(LABOR_LOGS).aggregate([
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

export async function weeklyBreakdown({ weekStart, userID } = {}) {
  if (!weekStart || !userID) {
    throw new Error('weekStart and userID are required for a labor breakdown.');
  }

  const dbInstance = await db.connect();
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const logs = await dbInstance.collection(LABOR_LOGS).aggregate([
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
    // Resolve the work order too, so non-repair sources (production pieces, customs)
    // that carry no repairID still surface with a title/status/discipline.
    {
      $lookup: {
        from: 'workOrders',
        localField: 'workOrderID',
        foreignField: 'workOrderID',
        as: 'wo',
      },
    },
    { $unwind: { path: '$wo', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        logID: 1,
        repairID: 1,
        workOrderID: 1,
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
        // Source-agnostic summary for the unified bench/My Work views.
        source: {
          type: { $ifNull: ['$sourceType', '$wo.sourceType', 'repair'] },
          sourceID: { $ifNull: ['$sourceID', '$repairID'] },
          workOrderID: '$workOrderID',
          title: { $ifNull: ['$wo.title', '$repair.description'] },
          status: { $ifNull: ['$wo.status', '$repair.status'] },
          discipline: '$wo.discipline',
        },
      },
    },
    { $sort: { createdAt: -1 } },
  ]).toArray();

  const repairIDs = new Set(logs.map((log) => log.repairID).filter(Boolean));
  const workOrderIDs = new Set(logs.map((log) => log.workOrderID || log.repairID).filter(Boolean));
  return {
    userID,
    userName: logs[0]?.primaryJewelerName || '',
    weekStart: start,
    repairsWorked: repairIDs.size,
    itemsWorked: workOrderIDs.size, // all sources (repairs + pieces + customs)
    entries: logs.length,
    laborHours: logs.reduce((sum, log) => sum + Number(log.creditedLaborHours || 0), 0),
    laborPay: logs.reduce((sum, log) => sum + Number(log.creditedValue || 0), 0),
    logs,
  };
}

export async function getDiagnostics({ weekStart } = {}) {
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
    dbInstance.collection(LABOR_LOGS).aggregate([
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
    dbInstance.collection(LABOR_LOGS).aggregate([
      { $match: logMatch },
      {
        $group: {
          _id: '$requiresAdminReview',
          count: { $sum: 1 },
        },
      },
    ]).toArray(),
    dbInstance.collection(LABOR_LOGS).aggregate([
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
          from: LABOR_LOGS,
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
