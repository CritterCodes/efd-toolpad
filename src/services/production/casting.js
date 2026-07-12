import PiecesModel, { CASTING_STATE } from '@/app/api/pieces/model';
import WorkOrdersModel, { WORK_ORDER_SOURCE } from '@/app/api/workOrders/model';
import BusinessExpensesModel from '@/app/api/businessExpenses/model';
import { DISCIPLINE } from '@/services/workOrders/disciplines';
import { addCastingCost } from '@/services/customs/customProduction';

const openPieceFilter = {
  status: { $nin: ['available', 'sold', 'scrapped', 'returned'] },
  designID: { $ne: null },
  $or: [{ 'casting.state': { $in: [CASTING_STATE.NEEDS_ORDERING, CASTING_STATE.ORDERED] } }, { casting: null }, { casting: { $exists: false } }],
};

export async function listCastingQueue() {
  return PiecesModel.list(openPieceFilter);
}

function positiveAmount(amount) {
  const value = Number(amount);
  if (!(value > 0)) {
    const error = new Error('Casting amount must be greater than zero.');
    error.code = 'BAD_REQUEST';
    throw error;
  }
  return value;
}

async function upsertCastingExpense(piece, { amount, vendor, invoiceNumber, purchaseOrder, createdBy }) {
  const fields = {
    expenseDate: new Date(), vendor, category: 'Materials / Parts', amount,
    invoiceNumber, paymentMethod: 'other', status: 'paid', isDeductible: true,
    notes: `Casting for piece ${piece.pieceID}${purchaseOrder ? ` · PO ${purchaseOrder}` : ''}`,
    sourceReferenceType: 'casting_piece', sourceReferenceID: piece.pieceID, createdBy,
  };
  const existing = await BusinessExpensesModel.findBySourceReference('casting_piece', piece.pieceID);
  return existing?.expenseID
    ? BusinessExpensesModel.updateByExpenseID(existing.expenseID, fields)
    : BusinessExpensesModel.create(fields);
}

export async function orderFromCarrera({ pieceID, amount, purchaseOrder = '', invoiceNumber = '', createdBy = null }) {
  const piece = await PiecesModel.findById(pieceID);
  if (!piece) throw new Error('Piece not found.');
  const cost = positiveAmount(amount);
  const expense = await upsertCastingExpense(piece, { amount: cost, vendor: 'Carrera', invoiceNumber, purchaseOrder, createdBy });
  const updated = await PiecesModel.transitionCasting(pieceID, CASTING_STATE.ORDERED, {
    source: 'carrera', vendor: 'Carrera', amount: cost, purchaseOrder, invoiceNumber, orderedAt: new Date(),
  });
  return { piece: updated, expense };
}

export async function castInHouse({ pieceID, hours, createdBy = null }) {
  const piece = await PiecesModel.findById(pieceID);
  if (!piece) throw new Error('Piece not found.');
  const laborHours = Number(hours);
  if (!(laborHours > 0)) { const error = new Error('Casting hours must be greater than zero.'); error.code = 'BAD_REQUEST'; throw error; }
  const existing = await WorkOrdersModel.findBySource(WORK_ORDER_SOURCE.PRODUCTION_PIECE, pieceID);
  let workOrder = existing.find((wo) => wo.discipline === DISCIPLINE.CASTING);
  if (!workOrder) {
    workOrder = await WorkOrdersModel.create({
      sourceType: WORK_ORDER_SOURCE.PRODUCTION_PIECE, sourceID: pieceID,
      seq: (piece.workOrderIDs || []).length + 1, discipline: DISCIPLINE.CASTING,
      title: `Cast ${piece.sku || pieceID}`, status: 'READY FOR WORK',
      tasks: [{ process: 'Cast in-house', estLaborHours: laborHours }], createdBy,
    });
    await PiecesModel.setWorkOrders(pieceID, [...(piece.workOrderIDs || []), workOrder.workOrderID]);
  }
  const updated = await PiecesModel.transitionCasting(pieceID, CASTING_STATE.ORDERED, {
    source: 'in_house', castingWorkOrderID: workOrder.workOrderID, orderedAt: new Date(),
  });
  return { piece: updated, workOrder };
}

export async function markCastingReceived({ pieceID, amount, vendor = '', invoiceNumber = '', notes = '', createdBy = null }) {
  const piece = await PiecesModel.findById(pieceID);
  if (!piece) throw new Error('Piece not found.');
  // Validate before running the existing idempotent effects.
  const cost = positiveAmount(amount);
  let effects;
  if (piece.customOrderID) {
    effects = await addCastingCost({ customID: piece.customOrderID, amount: cost, vendor, invoiceNumber, notes, createdBy });
  } else {
    const material = { id: `cast-${pieceID}`, name: vendor ? `Casting — ${vendor}` : 'Casting', unitCost: cost, qty: 1, vendor, invoiceNumber, notes };
    const updatedPiece = await PiecesModel.upsertMaterialByCategory(pieceID, 'casting', material);
    const expense = await upsertCastingExpense(piece, { amount: cost, vendor, invoiceNumber, purchaseOrder: piece.casting?.purchaseOrder, createdBy });
    effects = { piece: updatedPiece, expense, generation: { generated: 0, skipped: 'production-routing-existing' } };
  }
  const updated = await PiecesModel.transitionCasting(pieceID, CASTING_STATE.RECEIVED, { receivedAt: new Date() });
  return { ...effects, piece: updated };
}
