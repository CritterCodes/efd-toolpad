/**
 * Labor logs ↔ payroll (RepairLaborLogsModel delegates here): which credit is ready to batch, batching it, paying and releasing a batch. Moved verbatim from model.js (max-lines, 2026-10-01).
 */
import { db } from '@/lib/database';
import { PAYROLL_LOG_STATUS, buildPayrollBatchTotals, getWeekEndFromStart } from '@/services/payrollUtils';
import { LABOR_LOGS } from './collection';

export function buildUnbatchedMatch({ weekStart, weekEnd, userID, ownerUserIDs } = {}) {
  const match = {
    requiresAdminReview: false,
    pendingQc: { $ne: true }, // labor held until QC passes is not yet a payroll candidate
    $or: [
      { payrollStatus: { $exists: false } },
      { payrollStatus: PAYROLL_LOG_STATUS.UNBATCHED },
      { payrollStatus: '' },
    ],
  };

  // Self-labor (payer:'self') is NOT payroll-payable for a non-owner artisan — it realizes at
  // sale via consignment (§4.4). The OWNER's self-labor IS his payroll draw (self≈efd), so it
  // stays. Logs with no `payer` field (pre-S2, repairs) are `$ne 'self'` → always included.
  // Backward-compatible: without ownerUserIDs the clause is omitted (legacy behavior).
  if (Array.isArray(ownerUserIDs)) {
    match.$and = [{ $or: [{ payer: { $ne: 'self' } }, { primaryJewelerUserID: { $in: ownerUserIDs } }] }];
  }

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

export async function listPayrollCandidates({ weekStart, weekEnd, userID, ownerUserIDs } = {}) {
  const dbInstance = await db.connect();
  const match = buildUnbatchedMatch({ weekStart, weekEnd, userID, ownerUserIDs });

  return await dbInstance.collection(LABOR_LOGS).aggregate([
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

export async function payrollCandidateBreakdown({ weekStart, userID } = {}) {
  if (!weekStart || !userID) {
    throw new Error('weekStart and userID are required for a payroll candidate breakdown.');
  }

  const dbInstance = await db.connect();
  const start = new Date(weekStart);
  // EFD-DEFECTS P4. This used to match the week start EXACTLY (weekEnd = start), so a log whose stored
  // `weekStart` was not the same instant the batch normalizes to could never be batched: the queue groups
  // by the stored date and shows the credit, the batch re-normalizes to the week's Sunday, the breakdown
  // finds nothing, and the attempt throws "no eligible labor logs" at someone looking straight at the
  // money. That is what a week-boundary change does to the logs written before it — the shop moved from
  // Monday weeks to Sunday weeks on 2026-09-22. Matching the whole week instead means a credit is batched
  // with the week it belongs to however it was stored. No current log is affected: every one of them is
  // already stored at the week start, which is inside this range.
  const logs = await dbInstance.collection(LABOR_LOGS).aggregate([
    {
      $match: buildUnbatchedMatch({
        weekStart: start,
        weekEnd: getWeekEndFromStart(start),
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

export async function assignToPayrollBatch(logIDs = [], batchID = '') {
  if (!Array.isArray(logIDs) || logIDs.length === 0) {
    return 0;
  }

  const dbInstance = await db.connect();
  const result = await dbInstance.collection(LABOR_LOGS).updateMany(
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

export async function markBatchPaid(batchID, paidAt = new Date()) {
  const dbInstance = await db.connect();
  await dbInstance.collection(LABOR_LOGS).updateMany(
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

export async function releasePayrollBatch(batchID) {
  const dbInstance = await db.connect();
  await dbInstance.collection(LABOR_LOGS).updateMany(
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
