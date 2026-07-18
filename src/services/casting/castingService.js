/**
 * Source-agnostic casting surface (Production Pipeline §8).
 * Manages the needs_ordering → ordered → received state machine on pieces from
 * BOTH custom orders and production runs. Builds on the existing addCastingCost
 * backbone; the custom received path still calls generateWorkOrdersFromQuote.
 */
import PiecesModel, { CASTING_STATE } from '@/app/api/pieces/model';
import WorkOrdersModel, { WORK_ORDER_SOURCE } from '@/app/api/workOrders/model';
import { DISCIPLINE } from '@/services/workOrders/disciplines';
import { db } from '@/lib/database';

/** Read castingLaborFee from admin settings (flat per-casting artisan payout). */
async function getCastingLaborFee() {
  try {
    const dbInstance = await db.connect();
    const settings = await dbInstance.collection('adminSettings').findOne(
      { _id: 'repair_task_admin_settings' },
      { projection: { _id: 0, casting: 1 } },
    );
    const fee = Number(settings?.casting?.castingLaborFee);
    return fee >= 0 ? fee : 15;
  } catch {
    return 15;
  }
}

/** Pure guard: is this casting state transition forward-only and valid? */
export function guardedCastingTransition(currentState, newState) {
  const RANK = { needs_ordering: 0, ordered: 1, received: 2 };
  const cur = RANK[currentState] ?? -1;
  const next = RANK[newState];
  if (next === undefined) return { ok: false, reason: `unknown state: ${newState}` };
  if (next <= cur) return { ok: false, reason: `forward-only: cannot move '${currentState}' → '${newState}'` };
  return { ok: true };
}

/**
 * Carrera (external vendor) path. Records the PO/estimate on the piece and
 * sets casting=ordered (piece status → casting_ordered). No WO, no labor
 * credit, NO finalized business expense — the expense is booked only when
 * the casting is received and the final invoice amount is confirmed.
 */
export async function markCastingOrdered(pieceID, {
  vendor = 'Carrera', vendorPO = '', invoiceNumber = '', amount = 0,
  notes = '', createdBy = null,
} = {}) {
  const amt = Number(amount);
  if (!(amt >= 0)) throw Object.assign(new Error('amount must be >= 0'), { code: 'BAD_REQUEST' });

  const piece = await PiecesModel.findById(pieceID);
  if (!piece) throw Object.assign(new Error('Piece not found.'), { code: 'NOT_FOUND' });

  const guard = guardedCastingTransition(piece.casting, CASTING_STATE.ORDERED);
  if (!guard.ok) throw Object.assign(new Error(guard.reason), { code: 'BAD_REQUEST' });

  const updatedPiece = await PiecesModel.updateCasting(
    pieceID,
    CASTING_STATE.ORDERED,
    {
      status: 'casting_ordered',
      castingOrderEstimate: amt || null,
      castingVendor: vendor || null,
      castingVendorPO: vendorPO || null,
    },
  );
  return { piece: updatedPiece };
}

/**
 * In-house casting path. Creates a casting discipline work order on the piece
 * so the caster can claim it, complete it, and earn labor (hours × rate via the
 * normal bench flow). Sets casting=ordered to take the piece off the needs-ordering
 * board while the casting WO is active.
 */
export async function createInHouseCastingWO(pieceID, {
  title = null, estLaborHours = 0, tasks = null, createdBy = null,
} = {}) {
  const piece = await PiecesModel.findById(pieceID);
  if (!piece) throw Object.assign(new Error('Piece not found.'), { code: 'NOT_FOUND' });

  const guard = guardedCastingTransition(piece.casting, CASTING_STATE.ORDERED);
  if (!guard.ok) throw Object.assign(new Error(guard.reason), { code: 'BAD_REQUEST' });

  const seq = (piece.workOrderIDs?.length || 0) + 1;
  const resolvedTasks = Array.isArray(tasks) && tasks.length
    ? tasks
    : [{ process: 'In-house casting', estLaborHours: Number(estLaborHours) || 0 }];

  const wo = await WorkOrdersModel.create({
    sourceType: WORK_ORDER_SOURCE.PRODUCTION_PIECE,
    sourceID: pieceID,
    seq,
    discipline: DISCIPLINE.CASTING,
    title: title || `Casting — piece ${pieceID.slice(0, 8)}`,
    status: 'READY FOR WORK',
    tasks: resolvedTasks,
    metalType: piece.metalType ?? null,
    karat: piece.karat ?? null,
    createdBy,
  });
  await PiecesModel.setWorkOrders(pieceID, [...(piece.workOrderIDs || []), wo.workOrderID]);
  const updatedPiece = await PiecesModel.updateCasting(pieceID, CASTING_STATE.ORDERED);
  return { piece: updatedPiece, workOrder: wo };
}

/**
 * Casting received (Production Pipeline §8 step 3). Sets casting=received and runs
 * the three idempotent effects:
 *   1. Casting material line → piece COGS.
 *   2. businessExpenses ledger entry.
 *   3. Generate bench work orders ("metal in hand ⇒ bench can start"):
 *      - Custom piece  → generateWorkOrdersFromQuote (guarded by productionGeneratedAt).
 *      - Production    → spawn from design routing (guarded by castingReceivedAt).
 */
export async function markCastingReceived(pieceID, {
  amount = 0, vendor = '', invoiceNumber = '', notes = '',
  paymentMethod = 'other', status = 'paid', createdBy = null,
} = {}) {
  const amt = Number(amount);
  if (!(amt > 0)) throw Object.assign(new Error('Casting amount must be > 0.'), { code: 'BAD_REQUEST' });

  const piece = await PiecesModel.findById(pieceID);
  if (!piece) throw Object.assign(new Error('Piece not found.'), { code: 'NOT_FOUND' });

  const guard = guardedCastingTransition(piece.casting, CASTING_STATE.RECEIVED);
  if (!guard.ok) throw Object.assign(new Error(guard.reason), { code: 'BAD_REQUEST' });

  // Effect 1: casting material line on the piece (idempotent via category upsert).
  const material = {
    id: `cast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: vendor ? `Casting — ${vendor}` : 'Casting',
    unitCost: amt,
    qty: 1,
    vendor,
    invoiceNumber,
    notes,
  };
  await PiecesModel.upsertMaterialByCategory(pieceID, 'casting', material);

  // Effect 2: businessExpenses ledger entry (idempotent: update existing piece expense).
  const { default: BusinessExpensesModel } = await import('@/app/api/businessExpenses/model');
  const expenseFields = {
    expenseDate: new Date(),
    vendor,
    category: 'Materials / Parts',
    amount: amt,
    invoiceNumber,
    paymentMethod,
    status,
    notes: notes || `Casting received for piece ${pieceID}`,
    isDeductible: true,
    sourceReferenceType: 'piece',
    sourceReferenceID: pieceID,
    createdBy,
  };
  const existing = await BusinessExpensesModel.findBySourceReference('piece', pieceID);
  const expense = existing?.expenseID
    ? await BusinessExpensesModel.updateByExpenseID(existing.expenseID, expenseFields)
    : await BusinessExpensesModel.create(expenseFields);

  // Effect 3: generate bench work orders.
  let generation;
  if (piece.customOrderID) {
    // Custom piece: delegate to the existing quote-driven WO generator (guarded by productionGeneratedAt).
    const { generateWorkOrdersFromQuote } = await import('@/services/customs/customProduction');
    generation = await generateWorkOrdersFromQuote({ customID: piece.customOrderID, createdBy: createdBy || 'system' });
  } else {
    generation = await spawnBenchWOsFromDesign(piece, createdBy);
  }

  const updatedPiece = await PiecesModel.updateCasting(
    pieceID,
    CASTING_STATE.RECEIVED,
    { castingReceivedAt: new Date() },
  );
  return { piece: updatedPiece, expense, generation };
}

/**
 * Spawn bench work orders from the piece's design routing (production path).
 * Guarded by castingReceivedAt so calling twice doesn't double-spawn WOs.
 * Skips the casting discipline from routing since that WO may already exist.
 */
async function spawnBenchWOsFromDesign(piece, createdBy = 'system') {
  if (piece.castingReceivedAt) return { generated: 0, skipped: 'already-received' };

  let routing = [];
  if (piece.designID) {
    const DesignsModel = (await import('@/app/api/designs/model')).default;
    const design = await DesignsModel.findById(piece.designID);
    routing = Array.isArray(design?.routing) ? design.routing : [];
  }

  // Filter out casting discipline steps (those are handled by the casting WO path)
  // and fall back to a single bench_jewelry step if the design has no routing.
  const benchSteps = routing.filter((s) => s.discipline !== DISCIPLINE.CASTING);
  const steps = benchSteps.length ? benchSteps : [{ seq: 1, discipline: DISCIPLINE.BENCH_JEWELRY, process: 'Finishing' }];

  const currentWOIDs = piece.workOrderIDs || [];
  const newWOIDs = [];
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    const wo = await WorkOrdersModel.create({
      sourceType: WORK_ORDER_SOURCE.PRODUCTION_PIECE,
      sourceID: piece.pieceID,
      seq: currentWOIDs.length + i + 1,
      discipline: step.discipline || DISCIPLINE.BENCH_JEWELRY,
      title: step.process ? `${step.process}` : `Bench work`,
      metalType: piece.metalType ?? null,
      karat: piece.karat ?? null,
      status: 'READY FOR WORK',
      tasks: step.process ? [{ process: step.process, estLaborHours: Number(step.estLaborHours) || 0 }] : [],
      createdBy,
    });
    newWOIDs.push(wo.workOrderID);
  }

  await PiecesModel.setWorkOrders(piece.pieceID, [...currentWOIDs, ...newWOIDs]);
  return { generated: newWOIDs.length };
}

/**
 * Move a casting-discipline WO to QC, crediting the flat castingLaborFee from
 * admin settings (NOT hours × rate). Labor is held as pendingQc until QC passes.
 * Called from the bench work-orders action route for casting-discipline piece WOs
 * to override the generic hourly-rate path in movePieceToQc.
 */
export async function moveCastingWOToQc({ session, workOrderID, wo }) {
  const castingLaborFee = await getCastingLaborFee();
  const jewelerUserID = wo.assignedToUserID || session.user.userID;
  const jewelerName = wo.assignedJeweler || session.user.name;

  const { default: RepairLaborLogsModel } = await import('@/app/api/repairLaborLogs/model');
  await RepairLaborLogsModel.create({
    workOrderID,
    sourceType: wo.sourceType,
    sourceID: wo.sourceID,
    primaryJewelerUserID: jewelerUserID,
    primaryJewelerName: jewelerName,
    creditedLaborHours: 0,
    laborRateSnapshot: 0,
    creditedValue: castingLaborFee,
    sourceAction: 'casting_wo_move_to_qc',
    pendingQc: true,
    requiresAdminReview: false,
    notes: `In-house casting flat fee ($${castingLaborFee})`,
  });

  return WorkOrdersModel.updateByID(workOrderID, {
    status: 'QC',
    completedBy: session.user.name,
    completedAt: new Date(),
  });
}

/**
 * Complete a casting-discipline WO from QC. Releases the held labor log
 * (making it payable), finalizes the WO, then advances the piece to
 * casting=received and generates the downstream bench work orders exactly
 * once (guarded by castingReceivedAt / productionGeneratedAt). No expense
 * is booked here — for in-house casting, the artisan is paid via the labor
 * log, not a business expense.
 */
export async function completeCastingWOFromQc({ session, workOrderID, wo }) {
  const { default: RepairLaborLogsModel } = await import('@/app/api/repairLaborLogs/model');
  await RepairLaborLogsModel.releasePendingQc(workOrderID);

  const workOrder = await WorkOrdersModel.updateByID(workOrderID, {
    status: 'COMPLETED',
    qcDate: new Date(),
  });

  // Advance piece to received + generate bench WOs (no expense — in-house labor is
  // credited via the labor log, not a vendor invoice).
  const piece = await PiecesModel.findById(wo.sourceID);
  let generation = { generated: 0, skipped: 'piece-not-found' };
  if (piece) {
    const guard = guardedCastingTransition(piece.casting, CASTING_STATE.RECEIVED);
    if (guard.ok) {
      if (piece.customOrderID) {
        const { generateWorkOrdersFromQuote } = await import('@/services/customs/customProduction');
        generation = await generateWorkOrdersFromQuote({
          customID: piece.customOrderID, createdBy: session.user.userID || 'system',
        });
      } else {
        generation = await spawnBenchWOsFromDesign(piece, session.user.userID || 'system');
      }
      await PiecesModel.updateCasting(wo.sourceID, CASTING_STATE.RECEIVED, { castingReceivedAt: new Date() });
    } else {
      generation = { generated: 0, skipped: guard.reason };
    }
  }

  const updatedPiece = await PiecesModel.recomputeCosts(wo.sourceID);
  return { workOrder, piece: updatedPiece, generation };
}

/** All pieces with casting=needs_ordering, joined with their design name for the board. */
export async function listCastingQueue() {
  const pieces = await PiecesModel.listCastingQueue();
  if (!pieces.length) return [];

  const designIDs = [...new Set(pieces.map((p) => p.designID).filter(Boolean))];
  let designNames = {};
  if (designIDs.length) {
    const DesignsModel = (await import('@/app/api/designs/model')).default;
    const designs = await Promise.all(designIDs.map((id) => DesignsModel.findById(id)));
    for (const d of designs) {
      if (d) designNames[d.designID] = d.name;
    }
  }

  return pieces.map((p) => ({
    ...p,
    _designName: designNames[p.designID] || null,
    _source: p.customOrderID ? 'custom' : 'production',
  }));
}
