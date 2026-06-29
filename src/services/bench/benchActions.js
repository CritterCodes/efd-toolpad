/**
 * Unified bench actions (U1 — unify on workOrders). A single dispatcher that
 * drives every bench transition through the work-order surface, branching by
 * source type:
 *
 *   - repair WOs  → reuse the proven repairWorkflow builders + RepairsModel
 *                   (which auto-resyncs the work order via syncFromRepair), so
 *                   the repair flow stays the single source of truth — no fork.
 *   - piece WOs   → pieceWorkOrderActions (claim/complete: pays labor + COGS).
 *
 * Authorization mirrors the legacy /api/repairs/* routes (repairOps + the right
 * sub-capability), enforced here so the one bench endpoint stays consistent.
 */
import { db } from '@/lib/database';
import WorkOrdersModel, { WORK_ORDER_SOURCE } from '@/app/api/workOrders/model';
import RepairsModel from '@/app/api/repairs/model';
import { moveRepairToQc } from '@/app/api/repairs/[repairID]/send-to-qc/route';
import { claimPieceWorkOrder, movePieceToQc, completePieceWorkOrderFromQc, approveCadQc, rejectCadQc, submitCadGlbToQc, splitPieceTask } from '@/services/bench/pieceWorkOrderActions';
import { signOffAndHandoffRepair, creditRepairLaborAtQc } from '@/services/repairs/benchHandoff';
import {
  buildClaimRepairUpdate,
  buildUnclaimRepairUpdate,
  buildCompleteFromQcUpdate,
  buildMarkWaitingPartsUpdate,
  buildMarkPartsOrderedUpdate,
  buildPartsReadyForWorkUpdate,
  buildCommunicationCompleteUpdate,
  buildAssignBenchUpdate,
} from '@/services/repairWorkflow';

const PIECE_SOURCES = [WORK_ORDER_SOURCE.PRODUCTION_PIECE, WORK_ORDER_SOURCE.CUSTOM_PIECE];

function err(message, code) {
  const e = new Error(message);
  if (code) e.code = code;
  return e;
}

function isAdminRole(session) {
  return ['admin', 'dev'].includes(session?.user?.role);
}

/** Mirror requireRepairOps(cap): admin passes; else onsite repairOps + sub-cap. */
function assertRepairOps(session, capability = null) {
  if (isAdminRole(session)) return;
  const onsite = session?.user?.employment?.isOnsite === true
    && session?.user?.staffCapabilities?.repairOps === true;
  if (!onsite) throw err('Access denied. Repair operations capability required.', 'FORBIDDEN');
  if (capability && !session?.user?.staffCapabilities?.[capability]) {
    throw err(`Access denied. ${capability} capability required.`, 'FORBIDDEN');
  }
}

function assertAdmin(session) {
  if (!isAdminRole(session)) throw err('Access denied. Admin required.', 'FORBIDDEN');
}

/* ----------------------------- parts helpers ----------------------------- *
 * Copied verbatim from /api/repairs/[repairID]/mark-waiting-parts so the
 * unified path produces identical material + totals math.                    */
function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
function normalizeMaterial(material = {}) {
  const quantity = Math.max(toNumber(material.quantity, 1), 0);
  const price = Math.max(toNumber(material.price ?? material.retailPrice ?? material.unitCost, 0), 0);
  const name = String(material.name || material.displayName || material.description || '').trim();
  if (!name) throw err('Material name is required.', 'BAD_REQUEST');
  if (quantity <= 0) throw err('Material quantity must be greater than zero.', 'BAD_REQUEST');
  return {
    ...material,
    id: material.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    displayName: material.displayName || name,
    description: material.description || name,
    quantity,
    price,
    retailPrice: toNumber(material.retailPrice ?? price, price),
  };
}
function sumLineItems(items = []) {
  return items.reduce((sum, item) => sum + (toNumber(item.price, 0) * Math.max(toNumber(item.quantity, 1), 0)), 0);
}
function calculateRepairTotals(repair, materials) {
  const subtotal = sumLineItems(repair.tasks || [])
    + sumLineItems(materials)
    + sumLineItems(repair.customLineItems || []);
  const rushFee = toNumber(repair.rushFee, 0);
  const deliveryFee = repair.includeDelivery ? toNumber(repair.deliveryFee, 0) : 0;
  const taxRate = toNumber(repair.taxRate, 0);
  const taxAmount = repair.includeTax ? Math.round(subtotal * taxRate * 100) / 100 : 0;
  const totalCost = Math.round((subtotal + rushFee + deliveryFee + taxAmount) * 100) / 100;
  return { subtotal: Math.round(subtotal * 100) / 100, rushFee, deliveryFee, taxAmount, totalCost };
}

/* ------------------------------ jeweler lookup --------------------------- */
const ASSIGNABLE_ARTISAN_QUERY = {
  role: { $in: ['artisan', 'senior-artisan'] },
  isApproved: { $ne: false },
  isActive: { $ne: false },
  status: { $nin: ['inactive', 'disabled', 'deleted'] },
};
function getJewelerName(user) {
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  return fullName || user?.name || user?.email || 'Assigned Jeweler';
}

/* ------------------------------ repair actions --------------------------- */
async function runRepairAction({ session, repairID, action, body }) {
  const now = new Date();

  switch (action) {
    case 'claim': {
      assertRepairOps(session, 'benchWork');
      const repair = await RepairsModel.findById(repairID);
      return RepairsModel.updateById(repairID, buildClaimRepairUpdate({
        repair, userID: session.user.userID, userName: session.user.name, now,
      }));
    }
    case 'unclaim': {
      assertRepairOps(session, 'benchWork');
      const repair = await RepairsModel.findById(repairID);
      if (!isAdminRole(session) && repair.assignedTo !== session.user.userID) {
        throw err('You can only unclaim repairs assigned to you.', 'FORBIDDEN');
      }
      return RepairsModel.updateById(repairID, buildUnclaimRepairUpdate({ now }));
    }
    case 'move-to-qc': {
      assertRepairOps(session, 'benchWork');
      return moveRepairToQc(session, repairID);
    }
    case 'handoff': {
      // Bench-native partial sign-off + handoff. Auth mirrors move-to-qc (benchWork); the
      // service further requires the caller hold the repair OR be admin (acting on behalf).
      assertRepairOps(session, 'benchWork');
      const repair = await RepairsModel.findById(repairID);
      if (!isAdminRole(session) && repair.assignedTo !== session.user.userID) {
        throw err('You can only sign off / hand off a repair assigned to you.', 'FORBIDDEN');
      }
      return signOffAndHandoffRepair({
        session, repairID,
        completedTaskIndexes: body?.completedTaskIndexes || [],
        assignToUserID: body?.assignToUserID || null,
      });
    }
    case 'complete-from-qc': {
      assertRepairOps(session, 'qualityControl');
      // Labor is credited HERE (QC pass) — one payable log per jeweler from the sign-off
      // stamps, attributed to whoever did the work (not the QC actor). Before status flip.
      const repair = await RepairsModel.findById(repairID);
      await creditRepairLaborAtQc({ repair, session });
      const nextStatus = body?.deliveryBatched
        ? 'DELIVERY BATCHED'
        : (body?.readyForPickup ? 'READY FOR PICKUP' : 'COMPLETED');
      return RepairsModel.updateById(repairID, buildCompleteFromQcUpdate({
        nextStatus, userName: session.user.name, now,
      }));
    }
    case 'mark-waiting-parts': {
      assertRepairOps(session);
      const material = normalizeMaterial(body?.material || {});
      const repair = await RepairsModel.findById(repairID);
      const materials = [...(Array.isArray(repair.materials) ? repair.materials : []), material];
      const totals = calculateRepairTotals(repair, materials);
      return RepairsModel.updateById(repairID, buildMarkWaitingPartsUpdate({
        repair, materials, totals, userName: session.user.name,
        partsOrderedDate: body?.partsOrderedDate ? new Date(body.partsOrderedDate) : now, now,
      }));
    }
    case 'mark-parts-ordered': {
      assertRepairOps(session);
      const repair = await RepairsModel.findById(repairID);
      return RepairsModel.updateById(repairID, buildMarkPartsOrderedUpdate({
        repair, userName: session.user.name, now,
      }));
    }
    case 'parts-ready-for-work': {
      assertRepairOps(session);
      return RepairsModel.updateById(repairID, buildPartsReadyForWorkUpdate({ now }));
    }
    case 'communication-complete': {
      assertRepairOps(session, 'benchWork');
      const repair = await RepairsModel.findById(repairID);
      return RepairsModel.updateById(repairID, buildCommunicationCompleteUpdate({ repair, now }));
    }
    case 'assign': {
      assertAdmin(session);
      const userID = body?.userID;
      if (!userID) throw err('Jeweler is required.', 'BAD_REQUEST');
      const dbInstance = await db.connect();
      const jeweler = await dbInstance.collection('users').findOne(
        { ...ASSIGNABLE_ARTISAN_QUERY, userID },
        { projection: { _id: 0, userID: 1, firstName: 1, lastName: 1, name: 1, email: 1 } },
      );
      if (!jeweler) throw err('Assignable artisan not found.', 'NOT_FOUND');
      const repair = await RepairsModel.findById(repairID);
      const isSharedWork = repair.assignedTo && repair.assignedTo !== jeweler.userID;
      return RepairsModel.updateById(repairID, buildAssignBenchUpdate({
        repair, userID: jeweler.userID, userName: getJewelerName(jeweler), now,
        requiresLaborReview: isSharedWork,
      }));
    }
    default:
      throw err(`Unsupported repair action: ${action}`, 'BAD_REQUEST');
  }
}

/* ------------------------------ piece actions ---------------------------- */
async function runPieceAction({ session, workOrderID, action, body }) {
  switch (action) {
    case 'claim':
      return claimPieceWorkOrder({ session, workOrderID });
    case 'move-to-qc':
      return movePieceToQc({ session, workOrderID });
    case 'complete-from-qc':
      return completePieceWorkOrderFromQc({ session, workOrderID });
    case 'cad-submit-qc':
      return submitCadGlbToQc({ session, workOrderID });
    case 'split-task':
      return splitPieceTask({ session, workOrderID, taskIndex: body?.taskIndex, assignToUserID: body?.assignToUserID });
    case 'cad-qc-approve':
      return approveCadQc({ session, workOrderID });
    case 'cad-qc-reject':
      return rejectCadQc({ session, workOrderID, notes: body?.notes });
    default:
      throw err(`Unsupported piece action: ${action}`, 'BAD_REQUEST');
  }
}

/**
 * Run a bench action against a work order. Loads the WO, branches by source,
 * and returns the updated entity. Throws Error with .code ('FORBIDDEN',
 * 'NOT_FOUND', 'BAD_REQUEST', 'LANE_FORBIDDEN') the route maps to a status.
 */
export async function runBenchAction({ session, workOrderID, action, body = {} }) {
  const wo = await WorkOrdersModel.findByID(workOrderID);
  if (!wo) throw err('Work order not found.', 'NOT_FOUND');

  if (wo.sourceType === WORK_ORDER_SOURCE.REPAIR) {
    return runRepairAction({ session, repairID: wo.sourceID, action, body });
  }
  if (PIECE_SOURCES.includes(wo.sourceType)) {
    return runPieceAction({ session, workOrderID, action, body });
  }
  throw err(`No bench actions for source type: ${wo.sourceType}`, 'BAD_REQUEST');
}
