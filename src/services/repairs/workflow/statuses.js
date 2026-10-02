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
  SHIPPED_TO_SHOP: 'SHIPPED TO SHOP',
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
  REPAIR_STATUS.SHIPPED_TO_SHOP,
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
  [REPAIR_STATUS.SHIPPED_TO_SHOP]: 'Shipped by the wholesale partner - in transit to the shop',
  [REPAIR_STATUS.PAID_CLOSED]: 'Invoice paid and repair fully closed',
};

/**
 * What a STORE is shown. F52: a store's repair list rendered the raw enum as the chip — `RECEIVING`,
 * `NEEDS QUOTE`, `QC`, `DELIVERY BATCHED`, `PAID_CLOSED` — and the plain sentence above existed only as a
 * `title` tooltip, which does not exist at all on a touch screen. So a jeweller's customer-facing screen
 * showed them our shop-floor vocabulary in capitals, and the explanation was unreachable on the device they
 * were most likely holding.
 *
 * These are deliberately in the store's frame of reference rather than ours: `QC` is our step and their
 * wait, `DELIVERY BATCHED` is our batching and their "on its way back", `COMMUNICATION REQUIRED` means we
 * are waiting on *them*. Nothing internal changes — `REPAIR_STATUS` is still the status, the bench still
 * reads the same words, and `STATUS_DESCRIPTIONS` still explains them to staff.
 *
 * The wording is the owner's call; `docs/OPEN-QUESTIONS.md` carries the table so a line can change here
 * without touching a screen.
 */
export const STORE_STATUS_LABELS = {
  [REPAIR_STATUS.LEAD]: 'Estimate',
  [REPAIR_STATUS.RECEIVING]: 'Received',
  [REPAIR_STATUS.NEEDS_QUOTE]: 'Pricing',
  [REPAIR_STATUS.COMMUNICATION_REQUIRED]: 'Needs your input',
  [REPAIR_STATUS.NEEDS_PARTS]: 'Ordering parts',
  [REPAIR_STATUS.PARTS_ORDERED]: 'Parts on order',
  [REPAIR_STATUS.READY_FOR_WORK]: 'In the queue',
  [REPAIR_STATUS.IN_PROGRESS]: 'At the bench',
  [REPAIR_STATUS.QC]: 'Final check',
  [REPAIR_STATUS.COMPLETED]: 'Finished',
  [REPAIR_STATUS.READY_FOR_PICKUP]: 'Ready for pickup',
  [REPAIR_STATUS.DELIVERY_BATCHED]: 'Ready to return',
  [REPAIR_STATUS.PAID_CLOSED]: 'Closed',
  [REPAIR_STATUS.PENDING_PICKUP]: 'Awaiting pickup',
  [REPAIR_STATUS.PICKUP_REQUESTED]: 'Pickup requested',
  [REPAIR_STATUS.SHIPPED_TO_SHOP]: 'In transit to us',
  [REPAIR_STATUS.PICKED_UP]: 'Picked up',
  [REPAIR_STATUS.CANCELLED]: 'Cancelled',
};

/**
 * The words for a store, falling back to the raw status rather than to nothing. A status with no entry is
 * a bug the guard test catches, but a blank chip in front of a customer would be worse than our jargon.
 */
export function storeStatusLabel(status) {
  const normalized = normalizeRepairStatus(status);
  return STORE_STATUS_LABELS[normalized] || STORE_STATUS_LABELS[status] || status || '';
}

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
  [REPAIR_STATUS.SHIPPED_TO_SHOP]: { surface: 'admin_only', benchQueue: null },
  [REPAIR_STATUS.PICKED_UP]: { surface: 'admin_only', benchQueue: null },
  [REPAIR_STATUS.CANCELLED]: { surface: 'admin_only', benchQueue: null },
  [REPAIR_STATUS.LEAD]: { surface: 'admin_only', benchQueue: null },
};

export const STATUS_ALIAS_MAP = {
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
  'SHIPPED TO SHOP': REPAIR_STATUS.SHIPPED_TO_SHOP,
  'PICKED UP': REPAIR_STATUS.PICKED_UP,
  CANCELLED: REPAIR_STATUS.CANCELLED,
};

export const BENCH_STATUS_ALIAS_MAP = {
  UNCLAIMED: LEGACY_BENCH_STATUS.UNCLAIMED,
  'IN PROGRESS': LEGACY_BENCH_STATUS.IN_PROGRESS,
  'WAITING PARTS': LEGACY_BENCH_STATUS.WAITING_PARTS,
  QC: LEGACY_BENCH_STATUS.QC,
  COMMUNICATIONS: LEGACY_BENCH_STATUS.COMMUNICATIONS,
};

export const STATUS_VARIANTS = {
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
  [REPAIR_STATUS.SHIPPED_TO_SHOP]: ['SHIPPED TO SHOP'],
  [REPAIR_STATUS.PICKED_UP]: ['picked-up'],
  [REPAIR_STATUS.CANCELLED]: ['cancelled'],
  [REPAIR_STATUS.LEAD]: ['lead'],
};

export function normalizeToken(value) {
  return String(value || '')
    .trim()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toUpperCase();
}

export function cleanUpdate(update) {
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

