import { db } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';
import Constants from '@/lib/constants';
import { getMondayOfWeek, normalizePayrollLogStatus } from '@/services/payrollUtils';
import { LABOR_LOGS } from './collection';
import { apprenticeCreditHold } from '@/services/pay/apprentice';
// Reports and payroll live in their own modules (max-lines, 2026-10-01); the class keeps delegates, so every
// caller — and every vi.mock of this class — is unchanged.
import { weeklyReport as weeklyReportImpl, weeklyBreakdown as weeklyBreakdownImpl, getDiagnostics as getDiagnosticsImpl } from './reports';
import { buildUnbatchedMatch as buildUnbatchedMatchImpl, listPayrollCandidates as listPayrollCandidatesImpl, payrollCandidateBreakdown as payrollCandidateBreakdownImpl, assignToPayrollBatch as assignToPayrollBatchImpl, markBatchPaid as markBatchPaidImpl, releasePayrollBatch as releasePayrollBatchImpl } from './payroll';

export default class RepairLaborLogsModel {
  static COLLECTION = LABOR_LOGS; // see ./collection

  static async create(data) {
    const dbInstance = await db.connect();
    const now = new Date();

    // Resolve the work order this labor belongs to (S0 spine). New logs are
    // keyed by workOrderID; repairID is retained for back-compat lookups.
    let workOrderID = data.workOrderID || null;
    if (!workOrderID && data.repairID) {
      const wo = await dbInstance
        .collection(Constants.WORK_ORDERS_COLLECTION)
        .findOne(
          { sourceType: 'repair', sourceID: data.repairID },
          { projection: { workOrderID: 1 } }
        );
      workOrderID = wo?.workOrderID || null;
    }

    // Bench credit never pays an apprentice — they are paid on the time clock (services/pay/
    // apprentice.js). Checked HERE, the one sink every labor-writing route goes through, so a path
    // nobody thought to guard still can't pay the same hours twice. Held for review, not zeroed, so
    // the admin can move it to the jeweler who held the job.
    const sourceType = data.sourceType || (data.repairID ? 'repair' : null);
    const hold = await apprenticeCreditHold({ userID: data.primaryJewelerUserID, sourceType });

    const entry = {
      logID: uuidv4(),
      workOrderID,
      sourceType,
      sourceID: data.sourceID || data.repairID || null,
      repairID: data.repairID,
      primaryJewelerUserID: data.primaryJewelerUserID,
      primaryJewelerName: data.primaryJewelerName,
      // Connect-compat (S2): who bears this labor cost, and the per-artisan payee identity.
      // `payer` defaults to 'efd' (repairs + all legacy labor are EFD-paid); production/run labor
      // passes 'self' when the laborer owns the piece. `payeeUserID` defaults to the existing payee
      // field so it's backfill-safe and payroll can group on one field going forward.
      payer: data.payer === 'self' ? 'self' : 'efd',
      payeeUserID: data.payeeUserID ?? data.primaryJewelerUserID ?? null,
      creditedLaborHours: data.creditedLaborHours ?? 0,
      laborRateSnapshot: data.laborRateSnapshot ?? 0,
      // Flat-fee labor (CAD design fee, CAD QC review fee) passes creditedValue
      // directly (with 0 hours); hourly labor derives it from hours × rate.
      creditedValue: data.creditedValue != null
        ? Number(data.creditedValue) || 0
        : (data.creditedLaborHours ?? 0) * (data.laborRateSnapshot ?? 0),
      sourceAction: data.sourceAction,
      // Held until QC passes (piece bench work): not a payroll candidate while true.
      pendingQc: data.pendingQc ?? false,
      requiresAdminReview: hold ? true : (data.requiresAdminReview ?? false),
      ...(hold ? { apprenticeHold: true } : {}),
      adminReviewedBy: '',
      adminReviewedAt: null,
      notes: hold ? [data.notes, hold.holdNote].filter(Boolean).join(' — ') : (data.notes || ''),
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
          // Never a credit already in payroll (services/payrollUtils.isLaborLogLocked; EFD-DEFECTS P1).
          payrollStatus: { $nin: ['batched', 'paid'] },
          payrollBatchID: { $in: ['', null] },
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

  static weeklyReport(args) { return weeklyReportImpl(args); }

  static weeklyBreakdown(args) { return weeklyBreakdownImpl(args); }

  /**
   * All labor logs for one work order. Used by WO-completion billing, which must charge only THIS
   * work order's labor — `computePieceCosts` sums the whole PIECE, so billing from that would charge
   * the full piece once per work order on it.
   */
  static async findByWorkOrder(workOrderID) {
    if (!workOrderID) return [];
    const dbInstance = await db.connect();
    return dbInstance.collection(this.COLLECTION)
      .find({ workOrderID: String(workOrderID) }, { projection: { _id: 0 } })
      .toArray();
  }

  /** Release QC-held labor for a work order → payable (called when QC approves). */
  static async releasePendingQc(workOrderID) {
    const dbInstance = await db.connect();
    const result = await dbInstance.collection(this.COLLECTION).updateMany(
      { workOrderID, pendingQc: true },
      { $set: { pendingQc: false, updatedAt: new Date() } },
    );
    return result.modifiedCount;
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

  static buildUnbatchedMatch(args) { return buildUnbatchedMatchImpl(args); }

  static listPayrollCandidates(args) { return listPayrollCandidatesImpl(args); }

  static payrollCandidateBreakdown(args) { return payrollCandidateBreakdownImpl(args); }

  static assignToPayrollBatch(logIDs = [], batchID = '') { return assignToPayrollBatchImpl(logIDs, batchID); }

  static markBatchPaid(batchID, paidAt = new Date()) { return markBatchPaidImpl(batchID, paidAt); }

  static releasePayrollBatch(batchID) { return releasePayrollBatchImpl(batchID); }

  static getDiagnostics(args) { return getDiagnosticsImpl(args); }
}
