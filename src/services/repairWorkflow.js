export const REPAIR_STATUS = {
  LEAD: 'LEAD',
  RECEIVING: 'RECEIVING',
  NEEDS_QUOTE: 'NEEDS QUOTE',
  COMMUNICATION_REQUIRED: 'COMMUNICATION REQUIRED',
  NEEDS_PARTS: 'NEEDS PARTS',
  PARTS_ORDERED: 'PARTS ORDERED',
  READY_FOR_WORK: 'READY FOR WORK',
  IN_PROGRESS: 'IN PROGRESS',
  QC: 'QC',
  COMPLETED: 'COMPLETED',
  READY_FOR_PICKUP: 'READY FOR PICKUP',
  DELIVERY_BATCHED: 'DELIVERY BATCHED',
  PAID_CLOSED: 'PAID_CLOSED',
  PENDING_PICKUP: 'PENDING PICKUP',
  PICKUP_REQUESTED: 'PICKUP REQUESTED',
  PICKED_UP: 'PICKED UP',
  CANCELLED: 'CANCELLED',
};

export const LEGACY_BENCH_STATUS = {
  UNCLAIMED: 'UNCLAIMED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMMUNICATIONS: 'COMMUNICATIONS',
  WAITING_PARTS: 'WAITING_PARTS',
  QC: 'QC',
};

export const BENCH_QUEUE = {
  MINE: 'mine',
  UNCLAIMED: 'unclaimed',
  COMMUNICATIONS: 'communications',
  WAITING_PARTS: 'waiting_parts',
  QC: 'qc',
  IN_PROGRESS: 'in_progress',
};

export const BENCH_TABS = [
  { label: 'My Bench', key: BENCH_QUEUE.MINE },
  { label: 'Unclaimed', key: BENCH_QUEUE.UNCLAIMED },
  { label: 'Communications', key: BENCH_QUEUE.COMMUNICATIONS },
  { label: 'Needs Parts', key: BENCH_QUEUE.WAITING_PARTS },
  { label: 'QC', key: BENCH_QUEUE.QC },
];

export const MOVE_ALLOWED_STATUSES = [
  REPAIR_STATUS.RECEIVING,
  REPAIR_STATUS.NEEDS_QUOTE,
  REPAIR_STATUS.COMMUNICATION_REQUIRED,
  REPAIR_STATUS.NEEDS_PARTS,
  REPAIR_STATUS.PARTS_ORDERED,
  REPAIR_STATUS.READY_FOR_WORK,
  REPAIR_STATUS.READY_FOR_PICKUP,
  REPAIR_STATUS.DELIVERY_BATCHED,
  REPAIR_STATUS.PAID_CLOSED,
];

export const MOVE_PAGE_STATUS_OPTIONS = [
  REPAIR_STATUS.RECEIVING,
  REPAIR_STATUS.NEEDS_QUOTE,
  REPAIR_STATUS.COMMUNICATION_REQUIRED,
  REPAIR_STATUS.NEEDS_PARTS,
  REPAIR_STATUS.PARTS_ORDERED,
  REPAIR_STATUS.READY_FOR_WORK,
  REPAIR_STATUS.QC,
  REPAIR_STATUS.COMPLETED,
  REPAIR_STATUS.READY_FOR_PICKUP,
  REPAIR_STATUS.DELIVERY_BATCHED,
  REPAIR_STATUS.PAID_CLOSED,
];

export const QC_COMPLETION_STATUSES = [
  REPAIR_STATUS.COMPLETED,
  REPAIR_STATUS.READY_FOR_PICKUP,
  REPAIR_STATUS.DELIVERY_BATCHED,
];

export const WHOLESALE_INTAKE_STATUSES = [
  REPAIR_STATUS.PENDING_PICKUP,
  REPAIR_STATUS.PICKUP_REQUESTED,
];

export const WHOLESALE_ACTIVE_STATUSES = [
  REPAIR_STATUS.RECEIVING,
  REPAIR_STATUS.NEEDS_QUOTE,
  REPAIR_STATUS.COMMUNICATION_REQUIRED,
  REPAIR_STATUS.NEEDS_PARTS,
  REPAIR_STATUS.PARTS_ORDERED,
  REPAIR_STATUS.READY_FOR_WORK,
  REPAIR_STATUS.IN_PROGRESS,
  REPAIR_STATUS.QC,
];

export const WHOLESALE_COMPLETED_STATUSES = [
  REPAIR_STATUS.COMPLETED,
  REPAIR_STATUS.READY_FOR_PICKUP,
  REPAIR_STATUS.DELIVERY_BATCHED,
  REPAIR_STATUS.PAID_CLOSED,
];

export const STATUS_DESCRIPTIONS = {
  [REPAIR_STATUS.RECEIVING]: 'Initial intake - item just received',
  [REPAIR_STATUS.NEEDS_QUOTE]: 'Waiting on quote review before work can proceed',
  [REPAIR_STATUS.COMMUNICATION_REQUIRED]: 'Needs customer or internal communication before work can continue',
  [REPAIR_STATUS.NEEDS_PARTS]: 'Waiting for parts to be ordered',
  [REPAIR_STATUS.PARTS_ORDERED]: 'Parts have been ordered, waiting for arrival',
  [REPAIR_STATUS.READY_FOR_WORK]: 'All parts available, ready to start work',
  [REPAIR_STATUS.IN_PROGRESS]: 'Work is actively being performed',
  [REPAIR_STATUS.QC]: 'Work completed and cleaned, awaiting physical QC inspection',
  [REPAIR_STATUS.COMPLETED]: 'Passed QC and physically complete',
  [REPAIR_STATUS.READY_FOR_PICKUP]: 'Completed and ready for customer pickup',
  [REPAIR_STATUS.DELIVERY_BATCHED]: 'Completed and batched for delivery or invoicing',
  [REPAIR_STATUS.PAID_CLOSED]: 'Invoice paid and repair fully closed',
};

export const TRACKABLE_MOVE_STATUSES = [
  REPAIR_STATUS.PARTS_ORDERED,
];

export const STATUS_FIELD_LABELS = {
  [REPAIR_STATUS.PARTS_ORDERED]: 'Parts Ordered By',
};

export const STATUS_HELP_TEXT = {
  [REPAIR_STATUS.PARTS_ORDERED]: 'Who is ordering the parts?',
};

// This matrix is the source of truth for where a canonical workflow state should surface.
// Bench-visible statuses derive queues. Admin-only statuses stay off the bench on purpose.
export const STATUS_SURFACE_MATRIX = {
  [REPAIR_STATUS.RECEIVING]: { surface: 'admin_only', benchQueue: null },
  [REPAIR_STATUS.NEEDS_QUOTE]: { surface: 'admin_only', benchQueue: null },
  [REPAIR_STATUS.COMMUNICATION_REQUIRED]: { surface: 'bench_and_admin', benchQueue: BENCH_QUEUE.COMMUNICATIONS },
  [REPAIR_STATUS.NEEDS_PARTS]: { surface: 'bench_and_admin', benchQueue: BENCH_QUEUE.WAITING_PARTS },
  [REPAIR_STATUS.PARTS_ORDERED]: { surface: 'bench_and_admin', benchQueue: BENCH_QUEUE.WAITING_PARTS },
  [REPAIR_STATUS.READY_FOR_WORK]: { surface: 'bench_and_admin', benchQueue: BENCH_QUEUE.UNCLAIMED },
  [REPAIR_STATUS.IN_PROGRESS]: { surface: 'bench_and_admin', benchQueue: BENCH_QUEUE.IN_PROGRESS },
  [REPAIR_STATUS.QC]: { surface: 'bench_and_admin', benchQueue: BENCH_QUEUE.QC },
  [REPAIR_STATUS.COMPLETED]: { surface: 'admin_only', benchQueue: null },
  [REPAIR_STATUS.READY_FOR_PICKUP]: { surface: 'admin_only', benchQueue: null },
  [REPAIR_STATUS.DELIVERY_BATCHED]: { surface: 'admin_only', benchQueue: null },
  [REPAIR_STATUS.PAID_CLOSED]: { surface: 'admin_only', benchQueue: null },
  [REPAIR_STATUS.PENDING_PICKUP]: { surface: 'admin_only', benchQueue: null },
  [REPAIR_STATUS.PICKUP_REQUESTED]: { surface: 'admin_only', benchQueue: null },
  [REPAIR_STATUS.PICKED_UP]: { surface: 'admin_only', benchQueue: null },
  [REPAIR_STATUS.CANCELLED]: { surface: 'admin_only', benchQueue: null },
  [REPAIR_STATUS.LEAD]: { surface: 'admin_only', benchQueue: null },
};

const STATUS_ALIAS_MAP = {
  LEAD: REPAIR_STATUS.LEAD,
  RECEIVING: REPAIR_STATUS.RECEIVING,
  PENDING: REPAIR_STATUS.RECEIVING,
  'NEEDS QUOTE': REPAIR_STATUS.NEEDS_QUOTE,
  'NEEDS QUOTE REVIEW': REPAIR_STATUS.NEEDS_QUOTE,
  'COMMUNICATION REQUIRED': REPAIR_STATUS.COMMUNICATION_REQUIRED,
  'NEEDS PARTS': REPAIR_STATUS.NEEDS_PARTS,
  WAITING: REPAIR_STATUS.NEEDS_PARTS,
  'PARTS ORDERED': REPAIR_STATUS.PARTS_ORDERED,
  'READY FOR WORK': REPAIR_STATUS.READY_FOR_WORK,
  'IN PROGRESS': REPAIR_STATUS.IN_PROGRESS,
  QC: REPAIR_STATUS.QC,
  'QUALITY CONTROL': REPAIR_STATUS.QC,
  COMPLETED: REPAIR_STATUS.COMPLETED,
  READY: REPAIR_STATUS.READY_FOR_PICKUP,
  'READY FOR PICKUP': REPAIR_STATUS.READY_FOR_PICKUP,
  'READY FOR PICK UP': REPAIR_STATUS.READY_FOR_PICKUP,
  'DELIVERY BATCHED': REPAIR_STATUS.DELIVERY_BATCHED,
  'PAID CLOSED': REPAIR_STATUS.PAID_CLOSED,
  'PENDING PICKUP': REPAIR_STATUS.PENDING_PICKUP,
  'PICKUP REQUESTED': REPAIR_STATUS.PICKUP_REQUESTED,
  'PICKED UP': REPAIR_STATUS.PICKED_UP,
  CANCELLED: REPAIR_STATUS.CANCELLED,
};

const BENCH_STATUS_ALIAS_MAP = {
  UNCLAIMED: LEGACY_BENCH_STATUS.UNCLAIMED,
  'IN PROGRESS': LEGACY_BENCH_STATUS.IN_PROGRESS,
  'WAITING PARTS': LEGACY_BENCH_STATUS.WAITING_PARTS,
  QC: LEGACY_BENCH_STATUS.QC,
  COMMUNICATIONS: LEGACY_BENCH_STATUS.COMMUNICATIONS,
};

const STATUS_VARIANTS = {
  [REPAIR_STATUS.RECEIVING]: ['RECEIVING', 'pending'],
  [REPAIR_STATUS.NEEDS_QUOTE]: ['NEEDS QUOTE'],
  [REPAIR_STATUS.COMMUNICATION_REQUIRED]: ['COMMUNICATION REQUIRED'],
  [REPAIR_STATUS.NEEDS_PARTS]: ['NEEDS PARTS', 'waiting'],
  [REPAIR_STATUS.PARTS_ORDERED]: ['PARTS ORDERED'],
  [REPAIR_STATUS.READY_FOR_WORK]: ['READY FOR WORK', 'ready-for-work'],
  [REPAIR_STATUS.IN_PROGRESS]: ['IN PROGRESS', 'in-progress'],
  [REPAIR_STATUS.QC]: ['QC', 'quality-control', 'QUALITY CONTROL'],
  [REPAIR_STATUS.COMPLETED]: ['COMPLETED', 'completed'],
  [REPAIR_STATUS.READY_FOR_PICKUP]: ['READY FOR PICKUP', 'READY FOR PICK-UP', 'ready'],
  [REPAIR_STATUS.DELIVERY_BATCHED]: ['DELIVERY BATCHED'],
  [REPAIR_STATUS.PAID_CLOSED]: ['PAID_CLOSED'],
  [REPAIR_STATUS.PENDING_PICKUP]: ['PENDING PICKUP'],
  [REPAIR_STATUS.PICKUP_REQUESTED]: ['PICKUP REQUESTED'],
  [REPAIR_STATUS.PICKED_UP]: ['picked-up'],
  [REPAIR_STATUS.CANCELLED]: ['cancelled'],
  [REPAIR_STATUS.LEAD]: ['lead'],
};

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

function cleanUpdate(update) {
  return Object.fromEntries(
    Object.entries(update).filter(([, value]) => value !== undefined)
  );
}

export function normalizeRepairStatus(value) {
  const key = normalizeToken(value);
  return STATUS_ALIAS_MAP[key] || null;
}

export function normalizeBenchStatus(value) {
  const key = normalizeToken(value);
  return BENCH_STATUS_ALIAS_MAP[key] || null;
}

export function getRawStatusVariants(status) {
  return STATUS_VARIANTS[status] || [status];
}

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

export function buildReceiveRepairUpdate({ userID, internalNotes, now = new Date() }) {
  return cleanUpdate({
    receivedBy: userID,
    receivedAt: now,
    status: REPAIR_STATUS.READY_FOR_WORK,
    benchStatus: LEGACY_BENCH_STATUS.UNCLAIMED,
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
