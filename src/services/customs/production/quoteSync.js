import CustomOrdersModel from '@/app/api/custom-orders/model';
import { DISCIPLINE } from '@/services/workOrders/disciplines';
import { db } from '@/lib/database';
import Constants from '@/lib/constants';
import { WORK_ORDER_SOURCE } from '@/app/api/workOrders/model';
import WorkOrdersModel from '@/app/api/workOrders/model';
import PiecesModel from '@/app/api/pieces/model';
import { spawnCustomWorkOrder } from './setup';
/**
 * Generate bench work orders FROM the quote's labor tasks (the realignment: the quote
 * plans the work). Called when casting is received. Bundles tasks ONE WO PER DISCIPLINE
 * lane — most customs are all bench, so one jeweler claims/completes a single WO carrying
 * all the bench tasks; engraving/gem-cutting split into their own WO (different artisans).
 * Each WO's tasks[] carry the estimated hours (sum × the jeweler's rate = payout). CAD-lane
 * / auto lines (CAD design, GLB, QC) are skipped (handled by the design flow).
 * Idempotent — guarded by order.productionGeneratedAt.
 */
export async function generateWorkOrdersFromQuote({ customID, createdBy = 'system' }) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order) return null;
  if (order.productionGeneratedAt) return { generated: 0, skipped: 'already-generated' };

  // Group production labor tasks by lane (skip CAD-lane / no-WO lines).
  const byLane = new Map();
  for (const t of order.quote?.laborTasks || []) {
    const desc = String(t.description || '').trim();
    if (!desc || t.noWorkOrder || t.discipline === DISCIPLINE.CAD) continue;
    const lane = t.discipline || DISCIPLINE.BENCH_JEWELRY;
    if (!byLane.has(lane)) byLane.set(lane, []);
    byLane.get(lane).push({ process: desc, estLaborHours: Number(t.hours) || 0 });
  }

  let generated = 0;
  for (const [lane, laneTasks] of byLane) {
    const title = laneTasks.map((t) => t.process).join(' + ');
    await spawnCustomWorkOrder({ customID, discipline: lane, title, tasks: laneTasks, createdBy });
    generated += 1;
  }
  await CustomOrdersModel.updateById(customID, { productionGeneratedAt: new Date() });
  return { generated };
}

/**
 * Keep generated bench work orders in sync with the quote's labor plan. The quote PLANS
 * the work; once WOs are generated (casting received) their tasks drive the bench payout
 * (Σ estLaborHours × the jeweler's rate). Editing the quote afterward reconciles the WOs:
 * update hours, append added tasks, cull removed ones, spawn WOs for new lanes.
 *
 * Safe by construction:
 *  - Only touches PRE-QC work orders (READY FOR WORK / IN PROGRESS). Once a WO moves to QC
 *    its labor log is already written with frozen hours — restructuring it then would not
 *    (and must not) change a credited payout.
 *  - Deletes a WO only when it's emptied AND still unclaimed; claimed work is never deleted.
 *  - Matches by (discipline, process name), so a task split off to another jeweler keeps
 *    its own WO and just tracks the quote.
 * Idempotent.
 */
export const PRE_QC_WO_STATUSES = ['READY FOR WORK', 'IN PROGRESS'];

/** Planned hours from quote labor tasks, keyed `lane::process` (sums dupes per lane). */
export function planQuoteLaborHours(laborTasks = []) {
  const planned = new Map();
  for (const t of laborTasks || []) {
    const desc = String(t.description || '').trim();
    if (!desc || t.noWorkOrder || t.discipline === DISCIPLINE.CAD) continue;
    const lane = t.discipline || DISCIPLINE.BENCH_JEWELRY;
    const key = `${lane}::${desc.toLowerCase()}`;
    planned.set(key, (planned.get(key) || 0) + (Number(t.hours) || 0));
  }
  return planned;
}

/**
 * Pure core of the sync: given work orders + quote labor tasks, return the WO updates
 * (`[{ workOrderID, tasks }]`) needed to bring each WO task's estLaborHours in line with
 * the plan, matched by (discipline, process name). Only emits a WO if something changed.
 * Structure is preserved — tasks are never added, removed, or moved.
 */
export function applyQuoteHoursToWorkOrders(workOrders = [], laborTasks = []) {
  const planned = planQuoteLaborHours(laborTasks);
  if (!planned.size) return [];
  const updates = [];
  for (const wo of workOrders || []) {
    let changed = false;
    const tasks = (wo.tasks || []).map((task) => {
      const key = `${wo.discipline}::${String(task.process || '').trim().toLowerCase()}`;
      if (planned.has(key) && Number(task.estLaborHours) !== planned.get(key)) {
        changed = true;
        return { ...task, estLaborHours: planned.get(key) };
      }
      return task;
    });
    if (changed) updates.push({ workOrderID: wo.workOrderID, tasks });
  }
  return updates;
}

/** Desired bench tasks per lane: lane -> Map(processLower -> {process, estLaborHours}). */
export function desiredLaneTasks(laborTasks = []) {
  const byLane = new Map();
  for (const t of laborTasks || []) {
    const desc = String(t.description || '').trim();
    if (!desc || t.noWorkOrder || t.discipline === DISCIPLINE.CAD) continue;
    const lane = t.discipline || DISCIPLINE.BENCH_JEWELRY;
    if (!byLane.has(lane)) byLane.set(lane, new Map());
    const m = byLane.get(lane);
    const k = desc.toLowerCase();
    const prev = m.get(k);
    m.set(k, { process: prev?.process || desc, estLaborHours: (prev?.estLaborHours || 0) + (Number(t.hours) || 0) });
  }
  return byLane;
}

/**
 * Pure structural reconcile of generated bench WOs against the quote's labor tasks,
 * matched by (discipline, process name). Returns the diff to apply:
 *   - woUpdates: WOs whose task set changed — hours updated, removed tasks culled, and/or
 *     newly-added quote tasks appended to the lane's primary WO.
 *   - woEmptied: WOs whose tasks were ALL culled (caller deletes only if unclaimed).
 *   - spawns:    new {discipline, tasks} bundles for quote lanes that have no WO yet.
 * Caller passes PRE-QC WOs only, so claimed/QC'd work is never restructured. Splits are
 * preserved — a task is matched wherever it currently lives.
 */
export function reconcileQuoteToWorkOrders(workOrders = [], laborTasks = []) {
  const desired = desiredLaneTasks(laborTasks);
  const woUpdates = [];
  const woEmptied = [];

  // Coverage is computed from ALL work orders (incl. COMPLETED/QC) so we never spawn a
  // duplicate of work that's already on a (possibly finished) WO. Mutation, by contrast,
  // is restricted to PRE-QC WOs — completed/QC'd work is read-only.
  const covered = new Set();
  for (const wo of workOrders || []) {
    for (const t of wo.tasks || []) covered.add(`${wo.discipline}::${String(t.process || '').trim().toLowerCase()}`);
  }
  const mutable = (workOrders || []).filter((w) => PRE_QC_WO_STATUSES.includes(w.status));

  // Pass 1 — per MUTABLE WO: cull tasks the quote dropped, update hours on the rest.
  for (const wo of mutable) {
    const laneDesired = desired.get(wo.discipline) || new Map();
    let changed = false;
    const tasks = [];
    for (const task of wo.tasks || []) {
      const k = String(task.process || '').trim().toLowerCase();
      const want = laneDesired.get(k);
      if (want) {
        if (Number(task.estLaborHours) !== want.estLaborHours) { changed = true; tasks.push({ ...task, estLaborHours: want.estLaborHours }); }
        else tasks.push(task);
      } else {
        changed = true; // task removed from the quote → cull
      }
    }
    if (changed) (tasks.length === 0 ? woEmptied : woUpdates).push({ workOrderID: wo.workOrderID, tasks });
  }

  // Pass 2 — quote tasks not covered by ANY existing WO: append to the lane's primary
  // mutable (non-emptied) WO, else spawn a new lane WO.
  const emptiedIDs = new Set(woEmptied.map((w) => w.workOrderID));
  const laneTargets = new Map();
  for (const wo of [...mutable].sort((a, b) => (a.seq || 0) - (b.seq || 0))) {
    if (emptiedIDs.has(wo.workOrderID)) continue;
    if (!laneTargets.has(wo.discipline)) laneTargets.set(wo.discipline, wo);
  }
  const spawns = [];
  for (const [lane, m] of desired) {
    for (const [k, want] of m) {
      if (covered.has(`${lane}::${k}`)) continue;
      const target = laneTargets.get(lane);
      if (target) {
        let upd = woUpdates.find((u) => u.workOrderID === target.workOrderID);
        if (!upd) { upd = { workOrderID: target.workOrderID, tasks: [...(target.tasks || [])] }; woUpdates.push(upd); }
        upd.tasks.push({ process: want.process, estLaborHours: want.estLaborHours });
      } else {
        let s = spawns.find((x) => x.discipline === lane);
        if (!s) { s = { discipline: lane, tasks: [] }; spawns.push(s); }
        s.tasks.push({ process: want.process, estLaborHours: want.estLaborHours });
      }
    }
  }

  return { woUpdates, woEmptied, spawns };
}

/**
 * Apply the quote→WO reconcile against the order's PRE-QC bench work orders: update task
 * hours, append newly-added tasks, cull removed ones, spawn WOs for new lanes, and delete
 * a WO only if it was emptied AND is still unclaimed (never delete claimed/QC'd work — a
 * claimed-but-emptied WO just keeps an empty task set for the admin to handle). Idempotent.
 */
export async function syncQuoteToWorkOrders({ customID, createdBy = 'system' }) {
  const empty = { updated: 0, spawned: 0, removed: 0 };
  const order = await CustomOrdersModel.findById(customID);
  if (!order || !order.productionGeneratedAt) return empty;
  const pieceIDs = order.pieceIDs || [];
  if (!pieceIDs.length) return empty;

  const dbi = await db.connect();
  // Fetch ALL the order's piece WOs (any status). reconcile reads every WO for coverage
  // (so completed lanes aren't re-spawned) but only mutates the PRE-QC ones.
  const wos = await dbi.collection(Constants.WORK_ORDERS_COLLECTION)
    .find({
      sourceType: WORK_ORDER_SOURCE.PRODUCTION_PIECE,
      sourceID: { $in: pieceIDs },
    }, { projection: { _id: 0 } })
    .toArray();

  const { woUpdates, woEmptied, spawns } = reconcileQuoteToWorkOrders(wos, order.quote?.laborTasks || []);
  const woByID = new Map(wos.map((w) => [w.workOrderID, w]));

  for (const u of woUpdates) {
    await WorkOrdersModel.updateByID(u.workOrderID, { tasks: u.tasks });
  }

  let removed = 0;
  for (const e of woEmptied) {
    const wo = woByID.get(e.workOrderID);
    if (wo && wo.status === 'READY FOR WORK') {
      await dbi.collection(Constants.WORK_ORDERS_COLLECTION).deleteOne({ workOrderID: e.workOrderID });
      const piece = await PiecesModel.findById(wo.sourceID);
      if (piece) await PiecesModel.setWorkOrders(wo.sourceID, (piece.workOrderIDs || []).filter((id) => id !== e.workOrderID));
      removed += 1;
    } else {
      await WorkOrdersModel.updateByID(e.workOrderID, { tasks: [] }); // claimed → keep, empty
    }
  }

  let spawned = 0;
  for (const s of spawns) {
    await spawnCustomWorkOrder({ customID, discipline: s.discipline, title: s.tasks.map((t) => t.process).join(' + '), tasks: s.tasks, createdBy });
    spawned += 1;
  }

  return { updated: woUpdates.length, spawned, removed };
}

/** All work orders across the custom's piece(s), each with its accrued labor. */
export async function getCustomWorkOrders(customID) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order) return [];
  const pieceIDs = order.pieceIDs || [];
  if (!pieceIDs.length) return [];

  const dbi = await db.connect();
  const wos = await dbi.collection(Constants.WORK_ORDERS_COLLECTION)
    .find({ sourceType: WORK_ORDER_SOURCE.PRODUCTION_PIECE, sourceID: { $in: pieceIDs } }, { projection: { _id: 0 } })
    .sort({ seq: 1, createdAt: 1 })
    .toArray();
  if (!wos.length) return [];

  const ids = wos.map((w) => w.workOrderID);
  const logs = await dbi.collection(Constants.LABOR_LOGS_COLLECTION)
    .find({ workOrderID: { $in: ids } }, { projection: { _id: 0, workOrderID: 1, creditedValue: 1, creditedLaborHours: 1, requiresAdminReview: 1 } })
    .toArray();
  const laborByWO = {};
  for (const l of logs) {
    const acc = laborByWO[l.workOrderID] || { value: 0, hours: 0, requiresReview: false };
    acc.value += Number(l.creditedValue) || 0;
    acc.hours += Number(l.creditedLaborHours) || 0;
    acc.requiresReview = acc.requiresReview || !!l.requiresAdminReview;
    laborByWO[l.workOrderID] = acc;
  }
  return wos.map((w) => ({ ...w, labor: laborByWO[w.workOrderID] || { value: 0, hours: 0, requiresReview: false } }));
}

