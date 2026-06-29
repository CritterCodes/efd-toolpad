/**
 * Custom-order → production bench linkage (S7d). Spawns a Design + Piece (with routed
 * work orders) from a custom order and links them back. Reuses the S4 engine, so the
 * custom's fabrication work hits the unified bench, pays the artisan/owner via payroll
 * (owner draw), and accrues COGS → the order's margin. THIS is "customs on the bench".
 */
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

const DEFAULT_CLIENT_MGMT_BONUS_PCT = 0.05;

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

  const design = await DesignsModel.create({
    name: order.title || `Custom ${customID}`,
    description: order.description ?? null,
    status: DESIGN_STATUS.CAD,
    routing: [],
    createdBy: opts.createdBy ?? null,
  });
  const piece = await PiecesModel.create({
    designID: design.designID,
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
