/**
 * Create a Piece from a Design and spawn its routed work orders (S4).
 * Each routing step becomes a work order in its own discipline, so a single piece
 * fans out across the right benches (cad → jeweler → engraver, etc.). Labor logged
 * against those work orders rolls up into the piece's COGS.
 */
import DesignsModel from '@/app/api/designs/model';
import PiecesModel from '@/app/api/pieces/model';
import WorkOrdersModel, { WORK_ORDER_SOURCE } from '@/app/api/workOrders/model';
import { DISCIPLINE } from '@/services/workOrders/disciplines';

export async function createPieceFromDesign(designID, opts = {}) {
  const design = await DesignsModel.findById(designID);
  if (!design) throw new Error('Design not found.');

  const piece = await PiecesModel.create({
    designID,
    dropID: opts.dropID ?? design.dropID ?? null,
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

  // Default to a single bench_jewelry step if the design has no routing yet.
  const routing = (Array.isArray(design.routing) && design.routing.length)
    ? design.routing
    : [{ seq: 1, discipline: DISCIPLINE.BENCH_JEWELRY }];

  const workOrderIDs = [];
  for (let i = 0; i < routing.length; i += 1) {
    const step = routing[i];
    const wo = await WorkOrdersModel.create({
      sourceType: WORK_ORDER_SOURCE.PRODUCTION_PIECE,
      sourceID: piece.pieceID,
      seq: step.seq ?? i + 1,
      discipline: step.discipline || DISCIPLINE.BENCH_JEWELRY,
      title: step.title || `${design.name || 'Design'} — ${step.process || step.discipline || 'work'}`,
      description: step.description ?? null,
      metalType: opts.metalType ?? null,
      karat: opts.karat ?? null,
      status: 'READY FOR WORK',
      tasks: step.process ? [{ process: step.process, estLaborHours: step.estLaborHours ?? 0 }] : [],
      createdBy: opts.createdBy ?? null,
    });
    workOrderIDs.push(wo.workOrderID);
  }

  await PiecesModel.setWorkOrders(piece.pieceID, workOrderIDs);
  return PiecesModel.findById(piece.pieceID);
}
