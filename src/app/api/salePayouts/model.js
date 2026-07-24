import { db } from '@/lib/database';
import { v4 as uuidv4 } from 'uuid';
import {
  PAYROLL_LOG_STATUS,
  getMondayOfWeek,
  normalizePayrollLogStatus,
} from '@/services/payrollUtils';

export default class SalePayoutsModel {
  static COLLECTION = 'salePayouts';

  static async create(data) {
    const dbInstance = await db.connect();
    const now = new Date();
    const entry = {
      payoutID: data.payoutID || `spay-${uuidv4().slice(0, 8)}`,
      invoiceID: data.invoiceID,
      lineID: data.lineID,
      productID: data.productID || '',
      sellerUserID: data.sellerUserID,
      // Connect-compat (S2): per-artisan payee identity, defaulted from sellerUserID (backfill-safe).
      payeeUserID: data.payeeUserID ?? data.sellerUserID ?? null,
      sellerName: data.sellerName || '',
      saleDescription: data.saleDescription || '',
      grossSale: Number(data.grossSale || 0),
      consignmentRate: Number(data.consignmentRate || 0),
      consignmentAmount: Number(data.consignmentAmount || 0),
      estimatedLaborHoldback: Number(data.estimatedLaborHoldback || 0),
      actualLaborDeduction: Number(data.actualLaborDeduction || 0),
      payoutAmount: Number(data.payoutAmount || 0),
      linkedRepairIDs: Array.isArray(data.linkedRepairIDs) ? data.linkedRepairIDs : [],
      status: data.status || 'payable',
      weekStart: getMondayOfWeek(data.weekStart || now),
      payrollBatchID: data.payrollBatchID || '',
      payrollStatus: normalizePayrollLogStatus(data.payrollStatus),
      payrolledAt: data.payrolledAt || null,
      createdAt: now,
      updatedAt: now,
    };

    await dbInstance.collection(this.COLLECTION).insertOne(entry);
    return entry;
  }

  static async findByInvoiceID(invoiceID) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION)
      .find({ invoiceID })
      .project({ _id: 0 })
      .sort({ createdAt: -1 })
      .toArray();
  }

  static async findByPayoutID(payoutID) {
    const dbInstance = await db.connect();
    return await dbInstance.collection(this.COLLECTION)
      .findOne({ payoutID }, { projection: { _id: 0 } });
  }

  static async updateByPayoutID(payoutID, updateData) {
    const dbInstance = await db.connect();
    await dbInstance.collection(this.COLLECTION).updateOne(
      { payoutID },
      { $set: { ...updateData, updatedAt: new Date() } }
    );
    return await this.findByPayoutID(payoutID);
  }

  static async weeklyReport({ weekStart, weekEnd, userID } = {}) {
    const dbInstance = await db.connect();
    const match = {
      status: 'payable',
      payrollStatus: { $in: [PAYROLL_LOG_STATUS.UNBATCHED, '', null] },
    };
    if (weekStart) match.weekStart = { $gte: new Date(weekStart) };
    if (weekEnd) match.weekStart = { ...match.weekStart, $lte: new Date(weekEnd) };
    if (userID) match.sellerUserID = userID;

    return await dbInstance.collection(this.COLLECTION).aggregate([
      { $match: match },
      {
        $group: {
          _id: { userID: '$sellerUserID', weekStart: '$weekStart' },
          userName: { $first: '$sellerName' },
          payoutIDs: { $addToSet: '$payoutID' },
          salePay: { $sum: '$payoutAmount' },
          entries: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          userID: '$_id.userID',
          weekStart: '$_id.weekStart',
          userName: 1,
          payoutIDs: 1,
          salePay: 1,
          entries: 1,
        },
      },
      { $sort: { weekStart: -1, userName: 1 } },
    ]).toArray();
  }

  static async weeklyBreakdown({ weekStart, userID } = {}) {
    const dbInstance = await db.connect();
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);

    return await dbInstance.collection(this.COLLECTION)
      .find({
        status: 'payable',
        sellerUserID: userID,
        weekStart: { $gte: start, $lt: end },
        payrollStatus: { $in: [PAYROLL_LOG_STATUS.UNBATCHED, '', null] },
      })
      .project({ _id: 0 })
      .sort({ createdAt: -1 })
      .toArray();
  }

  static async assignToPayrollBatch(payoutIDs = [], batchID = '') {
    if (!Array.isArray(payoutIDs) || payoutIDs.length === 0) return 0;
    const dbInstance = await db.connect();
    const result = await dbInstance.collection(this.COLLECTION).updateMany(
      {
        payoutID: { $in: payoutIDs },
        status: 'payable',
        payrollStatus: { $in: [PAYROLL_LOG_STATUS.UNBATCHED, '', null] },
      },
      { $set: { payrollBatchID: batchID, payrollStatus: PAYROLL_LOG_STATUS.BATCHED, updatedAt: new Date() } }
    );
    return result.modifiedCount;
  }

  static async markBatchPaid(batchID, paidAt = new Date()) {
    const dbInstance = await db.connect();
    await dbInstance.collection(this.COLLECTION).updateMany(
      { payrollBatchID: batchID },
      { $set: { payrollStatus: PAYROLL_LOG_STATUS.PAID, payrolledAt: paidAt, updatedAt: new Date() } }
    );
  }

  static async releasePayrollBatch(batchID) {
    const dbInstance = await db.connect();
    await dbInstance.collection(this.COLLECTION).updateMany(
      { payrollBatchID: batchID },
      { $set: { payrollBatchID: '', payrollStatus: PAYROLL_LOG_STATUS.UNBATCHED, payrolledAt: null, updatedAt: new Date() } }
    );
  }
}
