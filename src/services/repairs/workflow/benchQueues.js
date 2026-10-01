import { BENCH_QUEUE, LEGACY_BENCH_STATUS, REPAIR_STATUS, WHOLESALE_ACTIVE_STATUSES, WHOLESALE_COMPLETED_STATUSES, WHOLESALE_INTAKE_STATUSES, getRawStatusVariants, normalizeBenchStatus, normalizeRepairStatus } from './statuses';
export function getActiveBenchRawStatuses() {
  return [
    ...getRawStatusVariants(REPAIR_STATUS.COMMUNICATION_REQUIRED),
    ...getRawStatusVariants(REPAIR_STATUS.NEEDS_PARTS),
    ...getRawStatusVariants(REPAIR_STATUS.PARTS_ORDERED),
    ...getRawStatusVariants(REPAIR_STATUS.READY_FOR_WORK),
    ...getRawStatusVariants(REPAIR_STATUS.IN_PROGRESS),
    ...getRawStatusVariants(REPAIR_STATUS.QC),
  ];
}

export function deriveBenchQueue(repair = {}) {
  const normalizedStatus = normalizeRepairStatus(repair.status);

  switch (normalizedStatus) {
    case REPAIR_STATUS.COMMUNICATION_REQUIRED:
      return BENCH_QUEUE.COMMUNICATIONS;
    case REPAIR_STATUS.NEEDS_PARTS:
    case REPAIR_STATUS.PARTS_ORDERED:
      return BENCH_QUEUE.WAITING_PARTS;
    case REPAIR_STATUS.READY_FOR_WORK:
      return repair.assignedTo ? BENCH_QUEUE.IN_PROGRESS : BENCH_QUEUE.UNCLAIMED;
    case REPAIR_STATUS.IN_PROGRESS:
      return BENCH_QUEUE.IN_PROGRESS;
    case REPAIR_STATUS.QC:
      return BENCH_QUEUE.QC;
    default: {
      if (normalizedStatus) return null;

      const fallbackBenchStatus = normalizeBenchStatus(repair.benchStatus);
      if (!fallbackBenchStatus) return null;

      if (fallbackBenchStatus === LEGACY_BENCH_STATUS.UNCLAIMED) return BENCH_QUEUE.UNCLAIMED;
      if (fallbackBenchStatus === LEGACY_BENCH_STATUS.IN_PROGRESS) return BENCH_QUEUE.IN_PROGRESS;
      if (fallbackBenchStatus === LEGACY_BENCH_STATUS.COMMUNICATIONS) return BENCH_QUEUE.COMMUNICATIONS;
      if (fallbackBenchStatus === LEGACY_BENCH_STATUS.WAITING_PARTS) return BENCH_QUEUE.WAITING_PARTS;
      if (fallbackBenchStatus === LEGACY_BENCH_STATUS.QC) return BENCH_QUEUE.QC;
      return null;
    }
  }
}

export function deriveCompatibilityBenchStatus(repair = {}) {
  const queue = deriveBenchQueue(repair);
  switch (queue) {
    case BENCH_QUEUE.UNCLAIMED:
      return LEGACY_BENCH_STATUS.UNCLAIMED;
    case BENCH_QUEUE.IN_PROGRESS:
      return LEGACY_BENCH_STATUS.IN_PROGRESS;
    case BENCH_QUEUE.COMMUNICATIONS:
      return LEGACY_BENCH_STATUS.COMMUNICATIONS;
    case BENCH_QUEUE.WAITING_PARTS:
      return LEGACY_BENCH_STATUS.WAITING_PARTS;
    case BENCH_QUEUE.QC:
      return LEGACY_BENCH_STATUS.QC;
    default:
      return null;
  }
}

export function getWorkflowProjection(repair = {}) {
  const status = normalizeRepairStatus(repair.status);
  const benchQueue = deriveBenchQueue(repair);
  const benchStatus = deriveCompatibilityBenchStatus(repair);
  const isBenchVisible = benchQueue !== null;

  return {
    status,
    benchQueue,
    benchStatus,
    isBenchVisible,
    isClaimable: benchQueue === BENCH_QUEUE.UNCLAIMED,
    isInProgress: benchQueue === BENCH_QUEUE.IN_PROGRESS,
    isInQc: benchQueue === BENCH_QUEUE.QC,
    isWaitingParts: benchQueue === BENCH_QUEUE.WAITING_PARTS,
    isCommunicationRequired: benchQueue === BENCH_QUEUE.COMMUNICATIONS,
  };
}

export function normalizeRepairWorkflow(repair = {}) {
  const projection = getWorkflowProjection(repair);
  return {
    ...repair,
    normalizedStatus: projection.status || repair.status || null,
    benchQueue: projection.benchQueue,
    benchStatus: projection.benchStatus,
  };
}

export function isWholesaleIntakeRepair(repair = {}) {
  const normalizedStatus = normalizeRepairStatus(repair.status);
  return WHOLESALE_INTAKE_STATUSES.includes(normalizedStatus);
}

export function isWholesaleActiveRepair(repair = {}) {
  const normalizedStatus = normalizeRepairStatus(repair.status);
  return WHOLESALE_ACTIVE_STATUSES.includes(normalizedStatus);
}

export function isWholesaleCompletedRepair(repair = {}) {
  const normalizedStatus = normalizeRepairStatus(repair.status);
  return WHOLESALE_COMPLETED_STATUSES.includes(normalizedStatus);
}

export function isRepairVisibleInBench(repair, { userID = '', isAdmin = false } = {}) {
  const projection = getWorkflowProjection(repair);
  if (!projection.isBenchVisible) return false;
  if (isAdmin) return true;
  if (projection.benchQueue === BENCH_QUEUE.IN_PROGRESS) return repair.assignedTo === userID;
  return true;
}

export function isRepairInBenchTab(repair, tabKey, userID = '') {
  const normalized = normalizeRepairWorkflow(repair);

  switch (tabKey) {
    case BENCH_QUEUE.MINE:
      return normalized.benchQueue !== null && normalized.assignedTo === userID;
    case BENCH_QUEUE.UNCLAIMED:
      return normalized.benchQueue === BENCH_QUEUE.UNCLAIMED;
    case BENCH_QUEUE.COMMUNICATIONS:
      return normalized.benchQueue === BENCH_QUEUE.COMMUNICATIONS;
    case BENCH_QUEUE.WAITING_PARTS:
      return normalized.benchQueue === BENCH_QUEUE.WAITING_PARTS;
    case BENCH_QUEUE.QC:
      return normalized.benchQueue === BENCH_QUEUE.QC;
    default:
      return false;
  }
}

