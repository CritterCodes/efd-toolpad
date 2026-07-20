/**
 * Custom-order → production bench linkage (S7d). Spawns a Design + Piece (with routed
 * work orders) from a custom order and links them back. Reuses the S4 engine, so the
 * custom's fabrication work hits the unified bench, pays the artisan/owner via payroll
 * (owner draw), and accrues COGS → the order's margin. THIS is "customs on the bench".
 */
import { randomUUID } from 'crypto';
import { db } from '@/lib/database';
import Constants from '@/lib/constants';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import DesignsModel, { DESIGN_STATUS } from '@/app/api/designs/model';
import PiecesModel from '@/app/api/pieces/model';
import WorkOrdersModel, { WORK_ORDER_SOURCE } from '@/app/api/workOrders/model';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import SettingsManagerService from '@/app/api/admin/settings/services/settingsManager.service';
import { DISCIPLINE } from '@/services/workOrders/disciplines';
import { createPieceFromDesign } from '@/services/production/pieceRouting';
import { getCustomTaskLine, mergeAutoLaborLine } from '@/services/customs/customTasks';
import { NotificationService, notifyAllAdmins } from '@/lib/notificationService';

const ADMIN_CUSTOM_LINK = (customID) => `${process.env.NEXT_PUBLIC_ADMIN_URL || ''}/dashboard/customs/${customID}`;

const DEFAULT_CLIENT_MGMT_BONUS_PCT = 0.05;

/**
 * A custom order is a bespoke one-off with no catalog variant, but a Design still needs
 * ≥1 Variant and a Piece must reference a real variantId (catalog contract §6/§7). Give
 * the custom's design a single default variant with a unique SKU so the piece references
 * an actual variant (not a dangling synthetic id).
 */
function defaultCustomVariant(customID) {
  const suffix = randomUUID().slice(0, 8);
  return { variantId: `custom-${customID}-${suffix}`, sku: `CUSTOM-${customID}-${suffix}`, active: true };
}

export async function addProductionToCustomOrder(customID, opts = {}) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order) throw new Error('Custom order not found.');

  // Use an existing design or create one from the order.
  let designID = opts.designID || null;
  let design = designID ? await DesignsModel.findById(designID) : null;
  if (!design) {
    design = await DesignsModel.create({
      name: order.title || `Custom ${customID}`,
      description: order.description ?? null,
      status: DESIGN_STATUS.CAD,
      routing: Array.isArray(opts.routing) ? opts.routing : [],
      variants: [defaultCustomVariant(customID)],
      createdBy: opts.createdBy ?? null,
    });
    designID = design.designID;
  }

  const piece = await createPieceFromDesign(designID, {
    metalType: opts.metalType ?? null,
    karat: opts.karat ?? null,
    customerID: order.clientID ?? null,
    customOrderID: customID,
    billing: order.billing ?? { mode: 'retail' },
    createdBy: opts.createdBy ?? null,
  });

  const updatedOrder = await CustomOrdersModel.linkProduction(customID, { designID, pieceID: piece.pieceID });
  return { design, piece, order: updatedOrder };
}

/**
 * Ensure the custom order has a Piece to hang work orders on — WITHOUT spawning
 * any default work orders (unlike createPieceFromDesign). The custom spine adds
 * work orders incrementally per stage (C6), so the piece starts bare.
 */
export async function ensureCustomPiece(customID, opts = {}) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order) throw new Error('Custom order not found.');
  if ((order.pieceIDs || []).length) return { pieceID: order.pieceIDs[0], order };

  const variant = defaultCustomVariant(customID);
  const design = await DesignsModel.create({
    name: order.title || `Custom ${customID}`,
    description: order.description ?? null,
    status: DESIGN_STATUS.CAD,
    routing: [],
    variants: [variant],
    createdBy: opts.createdBy ?? null,
  });
  const piece = await PiecesModel.create({
    designID: design.designID,
    // References the design's real default variant (created above). Config carries the
    // order's spec since a custom is bespoke.
    variantId: variant.variantId,
    resolvedConfiguration: { metalType: order.metalType ?? null, karat: order.karat ?? null, size: order.size ?? null },
    metalType: order.metalType ?? null,
    karat: order.karat ?? null,
    customerID: order.clientID ?? null,
    customOrderID: customID,
    billing: order.billing ?? { mode: 'retail' },
    createdBy: opts.createdBy ?? null,
  });
  const updatedOrder = await CustomOrdersModel.linkProduction(customID, { designID: design.designID, pieceID: piece.pieceID });
  return { pieceID: piece.pieceID, order: updatedOrder };
}

/**
 * Spawn ONE work order onto the custom's piece in a chosen discipline (the
 * incremental, per-stage spine: CAD → casting → bench cleanup → setting → …).
 * Optionally pre-assigned (e.g. the CAD designer at assignment time).
 */
export async function spawnCustomWorkOrder({
  customID, discipline = DISCIPLINE.BENCH_JEWELRY, title = null, cadStage = null,
  assignedToUserID = null, assignedJeweler = null, estLaborHours = 0, process = null, tasks = null, flatFee = 0, createdBy = null,
}) {
  const { pieceID } = await ensureCustomPiece(customID, { createdBy });
  const piece = await PiecesModel.findById(pieceID);
  const seq = (piece.workOrderIDs?.length || 0) + 1;

  // Resolve the assignee's name + (for CAD) their flat design fee from the profile
  // when only a userID is supplied (e.g. assigning a GLB stage from the UI).
  let resolvedName = assignedJeweler;
  let resolvedFee = Number(flatFee) || 0;
  if (assignedToUserID && (!resolvedName || (discipline === DISCIPLINE.CAD && !resolvedFee))) {
    const dbi = await db.connect();
    const u = await dbi.collection('users').findOne({ userID: assignedToUserID }, { projection: { _id: 0, firstName: 1, lastName: 1, name: 1, email: 1, artisanApplication: 1 } });
    if (u) {
      if (!resolvedName) resolvedName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.name || u.email || assignedToUserID;
      if (discipline === DISCIPLINE.CAD && !resolvedFee) resolvedFee = Number(u.artisanApplication?.customDesignFee) || 0;
    }
  }

  const wo = await WorkOrdersModel.create({
    sourceType: WORK_ORDER_SOURCE.PRODUCTION_PIECE,
    sourceID: pieceID,
    seq,
    discipline,
    cadStage: discipline === DISCIPLINE.CAD ? (cadStage || 'design') : null,
    title: title || `Custom ${customID} — ${discipline}`,
    status: assignedToUserID ? 'IN PROGRESS' : 'READY FOR WORK',
    assignedToUserID,
    assignedJeweler: resolvedName,
    claimedAt: assignedToUserID ? new Date() : null,
    flatFee: resolvedFee,
    // Multiple bundled tasks (one WO per lane) when `tasks` is supplied; else the single
    // process/estLaborHours form. The WO's tasks[] hours drive the bench payout (sum × rate).
    tasks: Array.isArray(tasks) && tasks.length
      ? tasks.map((t) => ({ process: t.process || discipline, estLaborHours: Number(t.estLaborHours) || 0 }))
      : ((process || Number(estLaborHours) > 0) ? [{ process: process || discipline, estLaborHours: Number(estLaborHours) || 0 }] : []),
    createdBy,
  });
  await PiecesModel.setWorkOrders(pieceID, [...(piece.workOrderIDs || []), wo.workOrderID]);

  // X7 — if this WO was spawned pre-assigned (e.g. the CAD/GLB designer at assignment
  // time), notify that artisan. Unassigned WOs (claimed later at the bench) skip this —
  // the claim itself notifies (W1). Best-effort; never block the spawn.
  if (assignedToUserID) {
    try {
      await NotificationService.createNotification({
        userId: assignedToUserID,
        type: 'custom-wo-assigned',
        title: 'New work order assigned',
        message: `You've been assigned "${wo.title}" for custom ${customID}.`,
        channels: ['inApp', 'push'],
        priority: 'normal',
        data: { actionUrl: ADMIN_CUSTOM_LINK(customID), customID, workOrderID: wo.workOrderID },
      });
    } catch (e) {
      console.error('⚠️ custom-wo-assigned notification failed:', e.message);
    }
  }

  // A GLB-stage CAD work order is a billable design opportunity — add a "GLB Creation"
  // labor line from the custom task catalog (priced like any task; falls back to the
  // designer's resolved fee if the seed hasn't run) so the client is charged for it.
  // It's a labor line, not a separate glbFee field — GLB is modeled as work (C4/C6).
  if (discipline === DISCIPLINE.CAD && cadStage === 'glb') {
    const order = await CustomOrdersModel.findById(customID);
    if (order) {
      const glbLine = await getCustomTaskLine('GLB Creation', { autoKey: 'custom-glb', fallbackCost: resolvedFee });
      const laborTasks = mergeAutoLaborLine(order.quote?.laborTasks, glbLine);
      await CustomOrdersModel.updateById(
        customID,
        { quote: { ...order.quote, laborTasks } },
        { changedBy: createdBy, reason: 'glb work order created' },
      );
    }
  }
  return wo;
}

/**
 * CASTING RECEIVED (C7 + realignment) — the workflow moment the cast metal arrives
 * with the vendor's invoice. Casting is a purchased input, so it:
 *  1. adds a material cost line to the piece (→ piece COGS → margin),
 *  2. writes a business-expense ledger entry,
 *  both stamped with the vendor's invoice number; and
 *  3. GENERATES the in-house bench work orders from the quote — you can't do bench
 *     work (cleanup, setting, polish) until the cast is in hand. Idempotent.
 */
export async function addCastingCost({ customID, amount, vendor = '', invoiceNumber = '', notes = '', paymentMethod = 'other', status = 'paid', createdBy = null }) {
  const amt = Number(amount);
  if (!(amt > 0)) { const e = new Error('Casting amount must be greater than zero.'); e.code = 'BAD_REQUEST'; throw e; }

  const { pieceID } = await ensureCustomPiece(customID, { createdBy });
  const material = {
    id: `cast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: vendor ? `Casting — ${vendor}` : 'Casting',
    unitCost: amt,
    qty: 1,
    vendor,
    invoiceNumber,
    notes,
  };
  // Idempotent: replace any prior casting line (don't double-count) so re-receiving
  // or correcting the casting invoice doesn't inflate piece COGS.
  const piece = await PiecesModel.upsertMaterialByCategory(pieceID, 'casting', material);

  // Lazy import to avoid a server-only model in the import graph until needed.
  const { default: BusinessExpensesModel } = await import('@/app/api/businessExpenses/model');
  // Mirror the idempotency on the ledger: update the existing casting expense for
  // this order rather than writing a second one.
  const expenseFields = {
    expenseDate: new Date(),
    vendor,
    category: 'Materials / Parts',
    amount: amt,
    invoiceNumber,
    paymentMethod,
    status,
    notes: notes || `Casting for custom ${customID}`,
    isDeductible: true,
    sourceReferenceType: 'custom_order',
    sourceReferenceID: customID,
    createdBy,
  };
  const existingExpense = await BusinessExpensesModel.findBySourceReference('custom_order', customID);
  const expense = existingExpense?.expenseID
    ? await BusinessExpensesModel.updateByExpenseID(existingExpense.expenseID, expenseFields)
    : await BusinessExpensesModel.create(expenseFields);

  // Casting is in hand → generate the in-house bench work orders from the quote (idempotent).
  const generation = await generateWorkOrdersFromQuote({ customID, createdBy: createdBy || 'system' });
  await CustomOrdersModel.updateById(customID, { castingReceivedAt: new Date() });

  // X6 — casting received: alert the production-team artisans assigned to this order's
  // work orders that the cast metal is in hand and bench work can begin. If no WOs are
  // assigned yet (freshly generated WOs start unassigned), fall back to alerting admins.
  // Best-effort — never block recording the casting cost.
  try {
    const wos = await getCustomWorkOrders(customID);
    const assigneeIDs = [...new Set(wos.map((w) => w.assignedToUserID).filter(Boolean))];
    if (assigneeIDs.length) {
      for (const userId of assigneeIDs) {
        await NotificationService.createNotification({
          userId,
          type: 'custom-casting-received',
          title: 'Casting received — bench work can begin',
          message: `The casting for custom ${customID} has arrived. Your bench work is ready to start.`,
          channels: ['inApp'],
          priority: 'normal',
          data: { actionUrl: ADMIN_CUSTOM_LINK(customID), customID },
        });
      }
    } else {
      // No assigned artisans yet — surface to admins so someone routes the bench work.
      await notifyAllAdmins({
        type: 'custom-casting-received',
        title: 'Casting received',
        message: `Casting for custom ${customID} has arrived and bench work orders were generated.`,
        actionUrl: ADMIN_CUSTOM_LINK(customID),
        priority: 'normal',
        relatedData: { customID },
      });
    }
  } catch (e) {
    console.error('⚠️ custom-casting-received notification failed:', e.message);
  }

  return { piece, expense, generation };
}

/**
 * Award the client-management bonus (C8) when an order completes. The assigned
 * CAD designer earns `clientMgmtBonusPct` of the order's profit IF they managed
 * the client themselves — i.e. they authored ≥1 outbound client-thread message
 * (if admin did the communicating, no bonus). The bonus is logged as a flat-fee
 * labor entry on the CAD work order, so payroll pays it and it nets out of margin.
 * Idempotent (guarded by order.clientMgmtBonusAwarded).
 */
export async function awardClientMgmtBonus({ customID }) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order || order.clientMgmtBonusAwarded) return null;

  const cad = (order.assignments || []).find((a) => a.role === 'cad' && a.userID);
  if (!cad) return null;

  const managedClient = (order.communications || []).some(
    (m) => (m.thread || 'client') === 'client' && m.direction === 'outbound' && m.authorUserID && m.authorUserID === cad.userID,
  );
  if (!managedClient) {
    await CustomOrdersModel.updateById(customID, { clientMgmtBonusAwarded: true, clientMgmtBonus: 0 });
    return { bonus: 0, eligible: false };
  }

  let pct = DEFAULT_CLIENT_MGMT_BONUS_PCT;
  try {
    const s = await SettingsManagerService.getSettings();
    const v = Number(s?.financial?.clientMgmtBonusPct);
    if (v >= 0 && v <= 1) pct = v;
  } catch { /* default */ }

  const margin = await CustomOrdersModel.marginFor(customID);
  const bonus = Math.round(Math.max(0, (margin?.margin || 0)) * pct * 100) / 100;

  if (bonus > 0) {
    const wos = await getCustomWorkOrders(customID);
    const target = wos.find((w) => w.discipline === DISCIPLINE.CAD) || wos[0];
    if (target) {
      await RepairLaborLogsModel.create({
        workOrderID: target.workOrderID, sourceType: target.sourceType, sourceID: target.sourceID,
        primaryJewelerUserID: cad.userID, primaryJewelerName: cad.name,
        creditedLaborHours: 0, creditedValue: bonus,
        sourceAction: 'client_mgmt_bonus', requiresAdminReview: false,
        notes: `Client-management bonus (${Math.round(pct * 100)}% of profit).`,
      });
      await PiecesModel.recomputeCosts(target.sourceID);
    }
  }

  await CustomOrdersModel.updateById(customID, { clientMgmtBonusAwarded: true, clientMgmtBonus: bonus, clientMgmtBonusUserID: cad.userID });
  return { bonus, eligible: true, designer: cad.name };
}

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
const PRE_QC_WO_STATUSES = ['READY FOR WORK', 'IN PROGRESS'];

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
function desiredLaneTasks(laborTasks = []) {
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
