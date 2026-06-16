/**
 * Bench actions for production-piece work orders (S4c): claim (with hard lane
 * enforcement) and complete (logs labor → pays the artisan + capitalizes into the
 * piece COGS). The piece analog of the repair claim / moveRepairToQc flow.
 *
 * Labor logs go into the unified `laborLogs` collection keyed by workOrderID, so
 * payroll picks them up exactly like repair labor.
 */
import WorkOrdersModel from '@/app/api/workOrders/model';
import PiecesModel from '@/app/api/pieces/model';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import { getLaborRateSnapshotForUser } from '@/app/api/repairLaborLogs/utils';
import { canClaimDiscipline, DISCIPLINE } from '@/services/workOrders/disciplines';

const ADMIN_ROLES = ['admin', 'dev'];
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
  if (wo.sourceType !== 'production_piece') {
    throw new Error('Not a production-piece work order.');
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

/** Complete a piece work order — logs labor and re-rolls the piece COGS. */
export async function completePieceWorkOrder({ session, workOrderID }) {
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
    sourceType: 'production_piece',
    sourceID: wo.sourceID,
    primaryJewelerUserID: session.user.userID,
    primaryJewelerName: session.user.name,
    creditedLaborHours,
    laborRateSnapshot,
    sourceAction: 'piece_work_complete',
    requiresAdminReview,
    notes: requiresAdminReview ? 'Confirm piece labor hours/rate before payout.' : '',
  });

  const workOrder = await WorkOrdersModel.updateByID(workOrderID, {
    status: 'COMPLETED',
    completedAt: new Date(),
  });
  const piece = await PiecesModel.recomputeCosts(wo.sourceID);
  return { workOrder, piece };
}

export { DISCIPLINE };
