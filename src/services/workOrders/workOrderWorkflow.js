/**
 * Source-agnostic bench projection over a Work Order (U1 — unify on workOrders).
 *
 * The unified bench reads `workOrders` (all sources) and needs the same
 * tab/queue semantics the repairs My Bench has. For repair-sourced work orders
 * the WO already mirrors the repair's `status`/`assignedTo` (kept fresh by
 * RepairsModel.updateById → WorkOrdersModel.syncFromRepair), so we reuse the
 * proven repair workflow projection rather than fork its logic. For production /
 * custom pieces we map their work-order status to the same queue vocabulary.
 *
 * Queue is DERIVED, never stored — the repair stays the source of truth, so the
 * bench can never drift out of sync with it.
 */
import {
  BENCH_QUEUE,
  BENCH_TABS,
  getWorkflowProjection,
} from '@/services/repairWorkflow';

export { BENCH_QUEUE, BENCH_TABS };

// Source-type strings, inlined (not imported from the work-order model) so this
// module stays free of server-only deps — it's imported by the client bench page.
const SOURCE_REPAIR = 'repair';

/** Work-order statuses that mean "actively on a piece bench" (not yet complete). */
const PIECE_TERMINAL = ['COMPLETED', 'DELIVERED', 'CANCELLED'];

function normalizePieceStatus(status) {
  return String(status || '').trim().toUpperCase().replace(/[_-]+/g, ' ');
}

/**
 * Derive the bench queue for a piece-style work order (production_piece /
 * custom_piece). Pieces don't carry the repair's parts/communications states;
 * they live in unclaimed → in-progress → qc → (complete, off bench).
 */
function derivePieceQueue(wo = {}) {
  const status = normalizePieceStatus(wo.status);
  if (PIECE_TERMINAL.includes(status)) return null;
  if (status === 'QC' || status === 'QUALITY CONTROL') return BENCH_QUEUE.QC;
  if (wo.assignedToUserID) return BENCH_QUEUE.IN_PROGRESS;
  return BENCH_QUEUE.UNCLAIMED;
}

/**
 * The bench queue for any work order. Repair → reuse repairWorkflow projection
 * (the WO mirrors the repair's status/assignedTo). Piece → derivePieceQueue.
 */
export function deriveWorkOrderQueue(wo = {}) {
  if (wo.sourceType === SOURCE_REPAIR) {
    return getWorkflowProjection({
      status: wo.status,
      assignedTo: wo.assignedToUserID,
      benchStatus: wo.benchStatus,
    }).benchQueue;
  }
  return derivePieceQueue(wo);
}

/** Attach the derived queue (+ a couple of convenience flags) to a work order. */
export function projectWorkOrder(wo = {}) {
  const benchQueue = deriveWorkOrderQueue(wo);
  return {
    ...wo,
    benchQueue,
    isBenchVisible: benchQueue !== null,
  };
}

/** Tab membership — mirrors isRepairInBenchTab but over a projected work order. */
export function isWorkOrderInTab(wo, tabKey, userID = '') {
  const benchQueue = wo.benchQueue ?? deriveWorkOrderQueue(wo);
  switch (tabKey) {
    case BENCH_QUEUE.MINE:
      return benchQueue !== null && !!wo.assignedToUserID && wo.assignedToUserID === userID;
    case BENCH_QUEUE.UNCLAIMED:
      return benchQueue === BENCH_QUEUE.UNCLAIMED;
    case BENCH_QUEUE.COMMUNICATIONS:
      return benchQueue === BENCH_QUEUE.COMMUNICATIONS;
    case BENCH_QUEUE.WAITING_PARTS:
      return benchQueue === BENCH_QUEUE.WAITING_PARTS;
    case BENCH_QUEUE.QC:
      return benchQueue === BENCH_QUEUE.QC;
    default:
      return false;
  }
}
