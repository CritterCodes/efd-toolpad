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
import { DISCIPLINE } from '@/services/workOrders/disciplines';
import { createPieceFromDesign } from '@/services/production/pieceRouting';

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
  customID, discipline = DISCIPLINE.BENCH_JEWELRY, title = null,
  assignedToUserID = null, assignedJeweler = null, estLaborHours = 0, process = null, flatFee = 0, createdBy = null,
}) {
  const { pieceID } = await ensureCustomPiece(customID, { createdBy });
  const piece = await PiecesModel.findById(pieceID);
  const seq = (piece.workOrderIDs?.length || 0) + 1;

  const wo = await WorkOrdersModel.create({
    sourceType: WORK_ORDER_SOURCE.PRODUCTION_PIECE,
    sourceID: pieceID,
    seq,
    discipline,
    title: title || `Custom ${customID} — ${discipline}`,
    status: assignedToUserID ? 'IN PROGRESS' : 'READY FOR WORK',
    assignedToUserID,
    assignedJeweler,
    claimedAt: assignedToUserID ? new Date() : null,
    flatFee: Number(flatFee) || 0,
    tasks: (process || Number(estLaborHours) > 0) ? [{ process: process || discipline, estLaborHours: Number(estLaborHours) || 0 }] : [],
    createdBy,
  });
  await PiecesModel.setWorkOrders(pieceID, [...(piece.workOrderIDs || []), wo.workOrderID]);
  return wo;
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
