import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import RepairPayrollBatchesModel from '@/app/api/repairPayrollBatches/model';
import {
  PAYROLL_BATCH_STATUS,
  canVoidPayrollBatch,
  getMondayOfWeek,
} from '@/services/payrollUtils';

function normalizeWeekStart(value) {
  return getMondayOfWeek(value || new Date());
}

function buildBatchFilter({ status, userID, weekStart, weekEnd } = {}) {
  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (userID) {
    filter.userID = userID;
  }

  if (weekStart || weekEnd) {
    filter.weekStart = {};
    if (weekStart) filter.weekStart.$gte = new Date(weekStart);
    if (weekEnd) filter.weekStart.$lte = new Date(weekEnd);
  }

  return filter;
}

async function enrichBatch(batch) {
  const breakdown = await RepairLaborLogsModel.weeklyBreakdown({
    weekStart: batch.weekStart,
    userID: batch.userID,
  });

  const includedLogs = (breakdown.logs || []).filter((log) => (batch.logIDs || []).includes(log.logID));

  return {
    ...batch,
    logs: includedLogs,
  };
}

export async function listPayrollCandidates({ weekStart, weekEnd, userID } = {}) {
  return await RepairLaborLogsModel.listPayrollCandidates({ weekStart, weekEnd, userID });
}

export async function getPayrollCandidateDetail({ weekStart, userID }) {
  return await RepairLaborLogsModel.payrollCandidateBreakdown({
    weekStart: normalizeWeekStart(weekStart),
    userID,
  });
}

export async function listPayrollHistory({ status, userID, weekStart, weekEnd } = {}) {
  return await RepairPayrollBatchesModel.list(buildBatchFilter({ status, userID, weekStart, weekEnd }));
}

export async function getPayrollBatchDetail(batchID) {
  const batch = await RepairPayrollBatchesModel.findByBatchID(batchID);
  return await enrichBatch(batch);
}

export async function createPayrollBatch({ weekStart, userID, createdBy, notes = '' }) {
  const normalizedWeekStart = normalizeWeekStart(weekStart);
  const existing = await RepairPayrollBatchesModel.findOpenByUserWeek({
    userID,
    weekStart: normalizedWeekStart,
  });

  if (existing) {
    throw new Error(`A payroll batch already exists for ${existing.userName || userID} on week of ${normalizedWeekStart.toLocaleDateString()}.`);
  }

  const candidate = await getPayrollCandidateDetail({
    weekStart: normalizedWeekStart,
    userID,
  });

  if (!candidate.logs || candidate.logs.length === 0) {
    throw new Error('No eligible reviewed labor logs are available for that jeweler and week.');
  }

  const batch = await RepairPayrollBatchesModel.create({
    userID,
    userName: candidate.userName,
    weekStart: normalizedWeekStart,
    laborHours: candidate.laborHours,
    laborPay: candidate.laborPay,
    repairsWorked: candidate.repairsWorked,
    entryCount: candidate.entryCount,
    logIDs: candidate.logIDs,
    status: PAYROLL_BATCH_STATUS.DRAFT,
    notes,
    createdBy,
  });

  const attachedCount = await RepairLaborLogsModel.assignToPayrollBatch(candidate.logIDs, batch.batchID);
  if (attachedCount !== candidate.logIDs.length) {
    await RepairPayrollBatchesModel.deleteByBatchID(batch.batchID);
    throw new Error('Payroll batch creation failed because one or more labor logs were already batched.');
  }

  return await getPayrollBatchDetail(batch.batchID);
}

export async function finalizePayrollBatch(batchID, { notes } = {}) {
  const batch = await RepairPayrollBatchesModel.findByBatchID(batchID);
  if (batch.status !== PAYROLL_BATCH_STATUS.DRAFT) {
    throw new Error('Only draft payroll batches can be finalized.');
  }

  return await RepairPayrollBatchesModel.updateByBatchID(batchID, {
    status: PAYROLL_BATCH_STATUS.FINALIZED,
    notes: notes ?? batch.notes,
  });
}

export async function markPayrollBatchPaid(batchID, {
  paidAt = new Date(),
  paymentMethod = '',
  paymentReference = '',
  notes,
} = {}) {
  const batch = await RepairPayrollBatchesModel.findByBatchID(batchID);
  if (batch.status !== PAYROLL_BATCH_STATUS.FINALIZED) {
    throw new Error('Only finalized payroll batches can be marked paid.');
  }

  const paidDate = new Date(paidAt);
  const updated = await RepairPayrollBatchesModel.updateByBatchID(batchID, {
    status: PAYROLL_BATCH_STATUS.PAID,
    paidAt: paidDate,
    paymentMethod,
    paymentReference,
    notes: notes ?? batch.notes,
  });

  await RepairLaborLogsModel.markBatchPaid(batchID, paidDate);
  return updated;
}

export async function voidPayrollBatch(batchID, { notes } = {}) {
  const batch = await RepairPayrollBatchesModel.findByBatchID(batchID);
  if (!canVoidPayrollBatch(batch.status)) {
    throw new Error('Only unpaid payroll batches can be voided.');
  }

  const updated = await RepairPayrollBatchesModel.updateByBatchID(batchID, {
    status: PAYROLL_BATCH_STATUS.VOID,
    notes: notes ?? batch.notes,
  });

  await RepairLaborLogsModel.releasePayrollBatch(batchID);
  return updated;
}

export async function getPayrollDiagnostics({ weekStart } = {}) {
  return await RepairLaborLogsModel.getDiagnostics({
    weekStart: weekStart ? normalizeWeekStart(weekStart) : undefined,
  });
}
