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
import { PutObjectCommand } from '@aws-sdk/client-s3';
import WorkOrdersModel from '@/app/api/workOrders/model';
import PiecesModel from '@/app/api/pieces/model';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import { getLaborRateSnapshotForUser } from '@/app/api/repairLaborLogs/utils';
import { canClaimDiscipline, DISCIPLINE } from '@/services/workOrders/disciplines';
import { storageClient, STORAGE_BUCKET, storageUrl } from '@/lib/storage';
import SettingsManagerService from '@/app/api/admin/settings/services/settingsManager.service';

const DEFAULT_QC_REVIEW_FEE = 25;
async function getQcReviewFee() {
  try {
    const s = await SettingsManagerService.getSettings();
    const fee = Number(s?.financial?.qcReviewFee);
    return fee > 0 ? fee : DEFAULT_QC_REVIEW_FEE;
  } catch {
    return DEFAULT_QC_REVIEW_FEE;
  }
}

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

/**
 * Upload the STL for a CAD work order (C6b). STL = the metal-only model for the
 * manufacturer/casting (no stones). Uploading it completes the CAD design step
 * and moves the WO to QC (CAD QC peer review, C6c). NO hourly labor is logged —
 * the CAD designer is paid the flat design fee captured in the quote (C4/C5),
 * not hours × rate. Stored to MinIO via lib/storage; mirrored onto the piece.
 */
export async function uploadCadStl({ session, workOrderID, file }) {
  const wo = await loadPieceWorkOrder(workOrderID);
  if (wo.discipline !== DISCIPLINE.CAD) {
    const e = new Error('STL upload is only for CAD work orders.'); e.code = 'BAD_REQUEST'; throw e;
  }
  if (!isAdminRole(session) && wo.assignedToUserID && wo.assignedToUserID !== session.user.userID) {
    const e = new Error('Only the assigned designer can upload the STL.'); e.code = 'FORBIDDEN'; throw e;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safe = (file.name || 'model.stl').replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `production/pieces/${wo.sourceID}/stl/${Date.now()}-${safe}`;
  await storageClient.send(new PutObjectCommand({
    Bucket: STORAGE_BUCKET, Key: key, Body: buffer, ContentType: file.type || 'model/stl',
  }));
  const stl = {
    url: storageUrl(key), key, originalName: file.name || null,
    uploadedBy: session.user.name || session.user.email || session.user.userID, uploadedAt: new Date(),
  };

  const piece = await PiecesModel.findById(wo.sourceID);
  if (piece) await PiecesModel.updateById(wo.sourceID, { files: { ...(piece.files || {}), stl } });

  return WorkOrdersModel.updateByID(workOrderID, {
    files: { ...(wo.files || {}), stl },
    status: 'QC',
    completedBy: session.user.name,
    completedAt: new Date(),
  });
}

/**
 * Approve a CAD work order out of QC — the paid PEER REVIEW (C6c). A CAD designer
 * OTHER than the author reviews the STL against the design-standards SOP and
 * approves. On approval we log two flat-fee labor entries into the piece COGS:
 *   - the author's CAD design fee (wo.flatFee) — now payable (labor-on-QC rule), and
 *   - the reviewer's flat QC review fee (admin setting).
 * Then the WO completes and COGS re-rolls. Author may not review their own work.
 */
export async function approveCadQc({ session, workOrderID }) {
  const wo = await loadPieceWorkOrder(workOrderID);
  if (wo.discipline !== DISCIPLINE.CAD) {
    const e = new Error('QC peer review applies only to CAD work orders.'); e.code = 'BAD_REQUEST'; throw e;
  }
  if (!isAdminRole(session) && wo.assignedToUserID === session.user.userID) {
    const e = new Error('A CAD designer cannot peer-review their own work.'); e.code = 'FORBIDDEN'; throw e;
  }

  // Author's CAD design fee → payable now that QC passed.
  if (Number(wo.flatFee) > 0) {
    await RepairLaborLogsModel.create({
      workOrderID, sourceType: wo.sourceType, sourceID: wo.sourceID,
      primaryJewelerUserID: wo.assignedToUserID, primaryJewelerName: wo.assignedJeweler,
      creditedLaborHours: 0, creditedValue: Number(wo.flatFee),
      sourceAction: 'cad_design_fee', requiresAdminReview: false,
    });
  }
  // Reviewer's flat QC review fee.
  const qcReviewFee = await getQcReviewFee();
  await RepairLaborLogsModel.create({
    workOrderID, sourceType: wo.sourceType, sourceID: wo.sourceID,
    primaryJewelerUserID: session.user.userID, primaryJewelerName: session.user.name,
    creditedLaborHours: 0, creditedValue: qcReviewFee,
    sourceAction: 'cad_qc_review', requiresAdminReview: false,
    notes: 'CAD QC peer review.',
  });

  const workOrder = await WorkOrdersModel.updateByID(workOrderID, {
    status: 'COMPLETED', qcBy: session.user.name, qcDate: new Date(),
  });
  const piece = await PiecesModel.recomputeCosts(wo.sourceID);
  return { workOrder, piece };
}

/** Reject a CAD work order at QC — back to the author (IN PROGRESS), no payout. */
export async function rejectCadQc({ session, workOrderID, notes = '' }) {
  const wo = await loadPieceWorkOrder(workOrderID);
  if (wo.discipline !== DISCIPLINE.CAD) {
    const e = new Error('QC peer review applies only to CAD work orders.'); e.code = 'BAD_REQUEST'; throw e;
  }
  if (!isAdminRole(session) && wo.assignedToUserID === session.user.userID) {
    const e = new Error('A CAD designer cannot peer-review their own work.'); e.code = 'FORBIDDEN'; throw e;
  }
  return WorkOrdersModel.updateByID(workOrderID, {
    status: 'IN PROGRESS', qcBy: null, qcDate: null,
    qcRejectedBy: session.user.name, qcRejectedAt: new Date(), qcRejectNotes: notes || '',
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
