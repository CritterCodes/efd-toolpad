import { assertCanHoldWork } from '@/services/pay/apprentice';
import { canClaimDiscipline } from '@/services/workOrders/disciplines';
import WorkOrdersModel from '@/app/api/workOrders/model';
import { NotificationService } from '@/lib/notificationService';
import { DISCIPLINE } from '@/services/workOrders/disciplines';
import { getLaborRateSnapshotForUser } from '@/app/api/repairLaborLogs/utils';
import { resolvePieceLaborScope } from '@/services/production/laborPayer';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import PiecesModel from '@/app/api/pieces/model';
import { advanceCustomOrderStatus } from '@/services/customs/customStatus';
import { BENCH_ACTION_URL, effectiveArtisanTypes, isAdminRole, loadPieceWorkOrder, woLabel } from './shared';
/** Claim a piece work order — enforces the discipline lane (D9). */
export async function claimPieceWorkOrder({ session, workOrderID }) {
  const wo = await loadPieceWorkOrder(workOrderID);
  await assertCanHoldWork(session.user.userID); // apprentices don't hold jobs

  if (!isAdminRole(session) && !canClaimDiscipline(effectiveArtisanTypes(session), wo.discipline)) {
    const error = new Error(`This work order is in the "${wo.discipline}" lane and can't be claimed from your disciplines.`);
    error.code = 'LANE_FORBIDDEN';
    throw error;
  }

  const updated = await WorkOrdersModel.updateByID(workOrderID, {
    status: 'IN PROGRESS',
    assignedToUserID: session.user.userID,
    assignedJeweler: session.user.name,
    claimedAt: new Date(),
  });

  // W1: notify the artisan who now owns this work order (best-effort — never block the claim).
  try {
    if (session.user.userID) {
      await NotificationService.createNotification({
        userId: session.user.userID,
        type: 'wo-assigned',
        title: 'Work order claimed',
        message: `You claimed "${woLabel(wo)}". It's now in progress on your bench.`,
        channels: ['inApp', 'email'],
        priority: 'normal',
        data: { actionUrl: BENCH_ACTION_URL },
      });
    }
  } catch (e) {
    console.error('[bench] wo-assigned (claim) notify failed:', e?.message || e);
  }

  return updated;
}

/**
 * Move a piece work order to QC — logs the artisan's labor (the piece analog of
 * the repair move-to-QC) and parks it in the QC queue. Mirrors repairs: labor
 * pay is captured at this transition, QC approval just finalizes.
 */
export async function movePieceToQc({ session, workOrderID }) {
  const wo = await loadPieceWorkOrder(workOrderID);

  // CAD work reaches QC by uploading the file (cad-submit-qc / the STL path), never by a plain move: My Bench's
  // "Move my bench to QC" swept CAD pieces in with no STL and wrote an hourly labor log for them (EFD-DEFECTS B5).
  if (wo.discipline === DISCIPLINE.CAD) {
    const error = new Error('CAD work goes to QC by submitting the file (Submit to QC on the card), not by Move to QC.');
    error.code = 'CONFLICT';
    throw error;
  }

  // Credit the work order's ASSIGNED jeweler, not whoever clicks — so an admin moving a
  // jeweler's piece to QC on their behalf pays the jeweler, never themselves (mirrors the
  // repair flow). Falls back to the caller only if the WO is somehow unassigned.
  const jewelerUserID = wo.assignedToUserID || session.user.userID;
  const jewelerName = wo.assignedJeweler || session.user.name;

  const creditedLaborHours = (wo.tasks || []).reduce((sum, t) => sum + (Number(t.estLaborHours) || 0), 0);
  const laborRateSnapshot = await getLaborRateSnapshotForUser({
    userID: jewelerUserID,
    session,
  });
  const requiresAdminReview = creditedLaborHours <= 0 || laborRateSnapshot <= 0;

  // Connect-compat (S2): mark self vs efd from the piece's owning artisan (fails safe to efd).
  const { payer, payeeUserID } = await resolvePieceLaborScope({ pieceID: wo.sourceID, laborerUserID: jewelerUserID });

  await RepairLaborLogsModel.create({
    workOrderID,
    sourceType: wo.sourceType,
    sourceID: wo.sourceID,
    primaryJewelerUserID: jewelerUserID,
    primaryJewelerName: jewelerName,
    creditedLaborHours,
    laborRateSnapshot,
    sourceAction: 'piece_move_to_qc',
    pendingQc: true, // held until QC approves (labor-payable-on-QC)
    requiresAdminReview,
    payer,
    payeeUserID,
    notes: requiresAdminReview ? 'Confirm piece labor hours/rate before payout.' : '',
  });

  const updated = await WorkOrdersModel.updateByID(workOrderID, {
    status: 'QC',
    completedBy: session.user.name,
    completedAt: new Date(),
  });

  // Bench work reaching QC = the linked custom order is at its qc stage. CAD QC is a
  // design-phase review months earlier and must NOT drag the order to qc — CAD WOs go
  // through the STL/GLB submit paths, and the discipline guard keeps any stray one out.
  if (wo.discipline !== DISCIPLINE.CAD) {
    try {
      const piece = await PiecesModel.findById(wo.sourceID);
      if (piece?.customOrderID) {
        await advanceCustomOrderStatus(piece.customOrderID, 'qc', { reason: `work order ${workOrderID} in QC` });
      }
    } catch (e) {
      console.error('[bench] custom-order qc advance failed:', e?.message || e);
    }
  }

  return updated;
}

