import { LEGACY_BENCH_STATUS, QC_COMPLETION_STATUSES, REPAIR_STATUS, cleanUpdate, normalizeRepairStatus } from './statuses';
import { deriveCompatibilityBenchStatus } from './benchQueues';
export function buildMoveStatusUpdate(status, metadata = {}, currentRepair = {}) {
  const normalizedStatus = normalizeRepairStatus(status);
  if (!normalizedStatus) {
    throw new Error(`Unknown repair status: ${status}`);
  }

  return cleanUpdate({
    ...metadata,
    status: normalizedStatus,
    benchStatus: deriveCompatibilityBenchStatus({
      ...currentRepair,
      status: normalizedStatus,
      ...metadata,
    }),
    updatedAt: metadata.updatedAt || new Date(),
  });
}

export function buildClaimRepairUpdate({ repair, userID, userName, now = new Date() }) {
  return cleanUpdate({
    assignedTo: userID,
    assignedJeweler: userName,
    claimedAt: now,
    status: REPAIR_STATUS.IN_PROGRESS,
    benchStatus: deriveCompatibilityBenchStatus({
      ...repair,
      assignedTo: userID,
      status: REPAIR_STATUS.IN_PROGRESS,
    }),
    requiresLaborReview: repair.assignedTo && repair.assignedTo !== userID ? true : undefined,
    updatedAt: now,
  });
}

export function buildAssignBenchUpdate({ repair, userID, userName, now = new Date(), requiresLaborReview = false }) {
  return cleanUpdate({
    assignedTo: userID,
    assignedJeweler: userName,
    claimedAt: now,
    status: REPAIR_STATUS.IN_PROGRESS,
    benchStatus: deriveCompatibilityBenchStatus({
      ...repair,
      assignedTo: userID,
      status: REPAIR_STATUS.IN_PROGRESS,
    }),
    requiresLaborReview: requiresLaborReview ? true : undefined,
    updatedAt: now,
  });
}

export function buildUnclaimRepairUpdate({ now = new Date() } = {}) {
  return {
    assignedTo: '',
    assignedJeweler: '',
    claimedAt: null,
    status: REPAIR_STATUS.READY_FOR_WORK,
    benchStatus: LEGACY_BENCH_STATUS.UNCLAIMED,
    updatedAt: now,
  };
}

export function buildMoveToQcUpdate({ userName, now = new Date() }) {
  return {
    status: REPAIR_STATUS.QC,
    benchStatus: LEGACY_BENCH_STATUS.QC,
    completedBy: userName,
    completedAt: now,
    updatedAt: now,
  };
}

export function buildMarkWaitingPartsUpdate({
  repair,
  materials,
  totals,
  userName,
  partsOrderedDate = new Date(),
  now = new Date(),
}) {
  return {
    status: REPAIR_STATUS.NEEDS_PARTS,
    benchStatus: deriveCompatibilityBenchStatus({
      ...repair,
      status: REPAIR_STATUS.NEEDS_PARTS,
    }),
    materials,
    ...totals,
    partsOrderedBy: userName,
    partsOrderedDate,
    updatedAt: now,
  };
}

export function buildMarkPartsOrderedUpdate({ repair, userName, now = new Date() }) {
  return {
    status: REPAIR_STATUS.PARTS_ORDERED,
    benchStatus: deriveCompatibilityBenchStatus({
      ...repair,
      status: REPAIR_STATUS.PARTS_ORDERED,
    }),
    partsOrderedBy: userName,
    partsOrderedDate: now,
    updatedAt: now,
  };
}

export function buildPartsReadyForWorkUpdate({ now = new Date() } = {}) {
  return {
    status: REPAIR_STATUS.READY_FOR_WORK,
    benchStatus: LEGACY_BENCH_STATUS.UNCLAIMED,
    updatedAt: now,
  };
}

export function buildCommunicationCompleteUpdate({ repair = {}, now = new Date() } = {}) {
  if (repair.assignedTo) {
    return {
      status: REPAIR_STATUS.IN_PROGRESS,
      benchStatus: LEGACY_BENCH_STATUS.IN_PROGRESS,
      updatedAt: now,
    };
  }

  return {
    status: REPAIR_STATUS.READY_FOR_WORK,
    benchStatus: LEGACY_BENCH_STATUS.UNCLAIMED,
    updatedAt: now,
  };
}

export function buildCompleteFromQcUpdate({ nextStatus, userName, now = new Date() }) {
  const normalizedStatus = normalizeRepairStatus(nextStatus);
  if (!QC_COMPLETION_STATUSES.includes(normalizedStatus)) {
    throw new Error(`Invalid QC completion status: ${nextStatus}`);
  }

  return {
    status: normalizedStatus,
    benchStatus: null,
    qcBy: userName,
    qcDate: now,
    completedBy: userName,
    completedAt: now,
    updatedAt: now,
  };
}

/**
 * Check-in. A store's Request Quote job (no tasks, $0) waits in NEEDS QUOTE, off the bench, until staff price it;
 * pricing moves it to READY FOR WORK (quoteRequest.buildQuoteReadyUpdate). Owner, 2026-10-01 (OPEN-QUESTIONS Q8).
 */
export function buildReceiveRepairUpdate({ userID, internalNotes, quoteRequested = false, now = new Date() }) {
  return cleanUpdate({
    receivedBy: userID,
    receivedAt: now,
    status: quoteRequested ? REPAIR_STATUS.NEEDS_QUOTE : REPAIR_STATUS.READY_FOR_WORK,
    benchStatus: quoteRequested ? null : LEGACY_BENCH_STATUS.UNCLAIMED,
    internalNotes,
    updatedAt: now,
  });
}

export function buildHandoffRepairUpdate({ targetUserID, targetUserName, now = new Date() }) {
  return {
    assignedTo: targetUserID,
    assignedJeweler: targetUserName,
    claimedAt: now,
    status: REPAIR_STATUS.IN_PROGRESS,
    benchStatus: LEGACY_BENCH_STATUS.IN_PROGRESS,
    requiresLaborReview: true,
    updatedAt: now,
  };
}

