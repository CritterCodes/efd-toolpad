/**
 * Bench actions for piece work orders — production AND custom pieces (U1 QC
 * unification). Mirrors the repair bench flow so EVERY source moves through the
 * same gate: claim → in progress → move to QC → approve from QC.
 *
 *   - claim            → lane-enforced (D9), status IN PROGRESS.
 *   - move to QC        → logs labor (pays the artisan + flags review like the
 *                         repair move-to-QC), status QC. Labor is logged HERE,
 *                         not at completion, exactly like repairs.
 *   - complete from QC  → status COMPLETED + re-roll the piece COGS (which picks
 *                         up the labor logged at the QC step). No second log.
 *
 * Labor logs go into the unified `laborLogs` collection keyed by workOrderID so
 * payroll picks them up exactly like repair labor.
 */
import WorkOrdersModel from '@/app/api/workOrders/model';
import PiecesModel from '@/app/api/pieces/model';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import { getLaborRateSnapshotForUser } from '@/app/api/repairLaborLogs/utils';
import { canClaimDiscipline, DISCIPLINE } from '@/services/workOrders/disciplines';

const ADMIN_ROLES = ['admin', 'dev'];
const PIECE_SOURCES = ['production_piece', 'custom_piece'];

function isAdminRole(session) {
  return ADMIN_ROLES.includes(session?.user?.role);
}
// Untagged users fall back to the jeweler lane (matches the bench read fallback).
function effectiveArtisanTypes(session) {
  const types = session?.user?.artisanTypes || [];
  return types.length ? types : ['Jeweler'];
}

async function loadPieceWorkOrder(workOrderID) {
  const wo = await WorkOrdersModel.findByID(workOrderID);
  if (!wo) throw new Error('Work order not found.');
  if (!PIECE_SOURCES.includes(wo.sourceType)) {
    throw new Error('Not a piece work order.');
  }
  return wo;
}

/** Claim a piece work order — enforces the discipline lane (D9). */
export async function claimPieceWorkOrder({ session, workOrderID }) {
  const wo = await loadPieceWorkOrder(workOrderID);

  if (!isAdminRole(session) && !canClaimDiscipline(effectiveArtisanTypes(session), wo.discipline)) {
    const error = new Error(`This work order is in the "${wo.discipline}" lane and can't be claimed from your disciplines.`);
    error.code = 'LANE_FORBIDDEN';
    throw error;
  }

  return WorkOrdersModel.updateByID(workOrderID, {
    status: 'IN PROGRESS',
    assignedToUserID: session.user.userID,
    assignedJeweler: session.user.name,
    claimedAt: new Date(),
  });
}

/**
 * Move a piece work order to QC — logs the artisan's labor (the piece analog of
 * the repair move-to-QC) and parks it in the QC queue. Mirrors repairs: labor
 * pay is captured at this transition, QC approval just finalizes.
 */
export async function movePieceToQc({ session, workOrderID }) {
  const wo = await loadPieceWorkOrder(workOrderID);

  const creditedLaborHours = (wo.tasks || []).reduce((sum, t) => sum + (Number(t.estLaborHours) || 0), 0);
  const laborRateSnapshot = await getLaborRateSnapshotForUser({
    userID: session.user.userID,
    email: session.user.email,
    session,
  });
  const requiresAdminReview = creditedLaborHours <= 0 || laborRateSnapshot <= 0;

  await RepairLaborLogsModel.create({
    workOrderID,
    sourceType: wo.sourceType,
    sourceID: wo.sourceID,
    primaryJewelerUserID: session.user.userID,
    primaryJewelerName: session.user.name,
    creditedLaborHours,
    laborRateSnapshot,
    sourceAction: 'piece_move_to_qc',
    requiresAdminReview,
    notes: requiresAdminReview ? 'Confirm piece labor hours/rate before payout.' : '',
  });

  return WorkOrdersModel.updateByID(workOrderID, {
    status: 'QC',
    completedBy: session.user.name,
    completedAt: new Date(),
  });
}

/** Approve a piece work order out of QC — finalize and re-roll the piece COGS. */
export async function completePieceWorkOrderFromQc({ workOrderID }) {
  const wo = await loadPieceWorkOrder(workOrderID);
  const workOrder = await WorkOrdersModel.updateByID(workOrderID, {
    status: 'COMPLETED',
    qcDate: new Date(),
  });
  const piece = await PiecesModel.recomputeCosts(wo.sourceID);
  return { workOrder, piece };
}

export { DISCIPLINE };
