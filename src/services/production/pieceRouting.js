/**
 * Create Pieces + spawn their routed work orders (S4). Each routing step becomes a
 * work order in its own discipline, so a single piece fans out across the right
 * benches (cad → jeweler → engraver, etc.). Labor logged against those work orders
 * rolls up into the piece's COGS.
 *
 * Two entry points:
 *  - `createPieceFromDesign` — the production path (routing comes from the Design).
 *  - `createDirectPiece`     — handmade / premade-with-CAD, no Design + no estimate
 *                              required (Pipeline M1-T4); COGS-only.
 */
import DesignsModel from '@/app/api/designs/model';
import PiecesModel from '@/app/api/pieces/model';
import WorkOrdersModel, { WORK_ORDER_SOURCE } from '@/app/api/workOrders/model';
import { DISCIPLINE } from '@/services/workOrders/disciplines';

const DEFAULT_ROUTING = [{ seq: 1, discipline: DISCIPLINE.BENCH_JEWELRY }];

/** Spawn one work order per routing step for a piece; returns the new WO ids. */
async function spawnPieceWorkOrders(piece, routing, { label = 'Piece', metalType = null, karat = null, createdBy = null } = {}) {
  const steps = (Array.isArray(routing) && routing.length) ? routing : DEFAULT_ROUTING;
  const workOrderIDs = [];
  for (let i = 0; i < steps.length; i += 1) {
    const step = steps[i];
    const wo = await WorkOrdersModel.create({
      sourceType: WORK_ORDER_SOURCE.PRODUCTION_PIECE,
      sourceID: piece.pieceID,
      seq: step.seq ?? i + 1,
      discipline: step.discipline || DISCIPLINE.BENCH_JEWELRY,
      title: step.title || `${label} — ${step.process || step.discipline || 'work'}`,
      description: step.description ?? null,
      metalType,
      karat,
      status: 'READY FOR WORK',
      tasks: step.process ? [{ process: step.process, estLaborHours: step.estLaborHours ?? 0 }] : [],
      createdBy,
    });
    workOrderIDs.push(wo.workOrderID);
  }
  return workOrderIDs;
}

export async function createPieceFromDesign(designID, opts = {}) {
  const design = await DesignsModel.findById(designID);
  if (!design) throw new Error('Design not found.');

  const piece = await PiecesModel.create({
    designID,
    gemstoneId: opts.gemstoneId ?? design.gemstoneId ?? null,   // carry the originating gemstone (M1-T2)
    dropId: opts.dropId ?? design.dropId ?? null,
    metalType: opts.metalType ?? null,
    karat: opts.karat ?? null,
    sku: opts.sku ?? null,
    serialNumber: opts.serialNumber ?? null,
    customerID: opts.customerID ?? null,   // present for customs (S7)
    customOrderID: opts.customOrderID ?? null,
    billing: opts.billing ?? null,
    actualMaterials: Array.isArray(opts.actualMaterials) ? opts.actualMaterials : [],
    createdBy: opts.createdBy ?? null,
  });

  const workOrderIDs = await spawnPieceWorkOrders(piece, design.routing, {
    label: design.name || 'Design',
    metalType: opts.metalType ?? null,
    karat: opts.karat ?? null,
    createdBy: opts.createdBy ?? null,
  });
  await PiecesModel.setWorkOrders(piece.pieceID, workOrderIDs);
  return PiecesModel.findById(piece.pieceID);
}

/**
 * Create a Piece DIRECTLY — handmade or premade-with-CAD — with NO Design and NO
 * estimate required (Pipeline M1-T4). COGS is recorded from `actualMaterials` plus
 * the labor logged on its bench work order(s); no `designCost`/STL estimate is
 * involved. An optional `designID` may still be linked (premade CAD lives on the
 * design) but is not required. Routing = `opts.routing`, else the linked design's
 * routing, else a single bench_jewelry step.
 */
export async function createDirectPiece(opts = {}) {
  const design = opts.designID ? await DesignsModel.findById(opts.designID) : null;

  const piece = await PiecesModel.create({
    designID: opts.designID ?? null,
    gemstoneId: opts.gemstoneId ?? design?.gemstoneId ?? null,
    dropId: opts.dropId ?? design?.dropId ?? null,
    metalType: opts.metalType ?? null,
    karat: opts.karat ?? null,
    sku: opts.sku ?? null,
    serialNumber: opts.serialNumber ?? null,
    customerID: opts.customerID ?? null,
    customOrderID: opts.customOrderID ?? null,
    billing: opts.billing ?? null,
    actualMaterials: Array.isArray(opts.actualMaterials) ? opts.actualMaterials : [],
    createdBy: opts.createdBy ?? null,
  });

  const routing = (Array.isArray(opts.routing) && opts.routing.length)
    ? opts.routing
    : (design?.routing?.length ? design.routing : DEFAULT_ROUTING);
  const workOrderIDs = await spawnPieceWorkOrders(piece, routing, {
    label: opts.title || design?.name || opts.sku || 'Handmade piece',
    metalType: opts.metalType ?? null,
    karat: opts.karat ?? null,
    createdBy: opts.createdBy ?? null,
  });
  await PiecesModel.setWorkOrders(piece.pieceID, workOrderIDs);
  return PiecesModel.findById(piece.pieceID);
}
