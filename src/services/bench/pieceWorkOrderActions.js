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
import CustomOrdersModel from '@/app/api/custom-orders/model';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import { getLaborRateSnapshotForUser } from '@/app/api/repairLaborLogs/utils';
import { canClaimDiscipline, DISCIPLINE } from '@/services/workOrders/disciplines';
import { resolvePieceLaborScope } from '@/services/production/laborPayer';
import { storageClient, STORAGE_BUCKET, storageUrl } from '@/lib/storage';
import SettingsManagerService from '@/app/api/admin/settings/services/settingsManager.service';
import { getSTLVolume } from '@/lib/stlParser';
import { createShareLink, setShareEnabled } from '@/services/customs/customViewer';
import { db } from '@/lib/database';
import { NotificationService, notifyAllAdmins } from '@/lib/notificationService';

const BENCH_ACTION_URL = `${process.env.NEXT_PUBLIC_ADMIN_URL || ''}/dashboard/bench`;
const customLink = (customID) => `${process.env.NEXT_PUBLIC_ADMIN_URL || ''}/dashboard/customs/${customID}`;

/** Resolve the linked customID (if any) for a piece work order, for notification links. */
async function customIDForWorkOrder(wo) {
  try {
    const piece = await PiecesModel.findById(wo.sourceID);
    return piece?.customOrderID || null;
  } catch {
    return null;
  }
}

/** Short human label for a work order used in notification copy. */
function woLabel(wo) {
  return wo?.title || wo?.discipline || `Work order ${wo?.workOrderID || ''}`.trim();
}

/** STL files are authored in mm; the cost estimator works in cm³ (1 cm³ = 1000 mm³). */
async function stlVolumeCm3(arrayBuffer) {
  try {
    const mm3 = await getSTLVolume(arrayBuffer);
    if (!Number.isFinite(mm3) || mm3 <= 0) return null;
    return Math.round((mm3 / 1000) * 1000) / 1000; // cm³, 3dp
  } catch {
    return null; // a parse failure must never block the upload
  }
}

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

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const safe = (file.name || 'model.stl').replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `production/pieces/${wo.sourceID}/stl/${Date.now()}-${safe}`;
  await storageClient.send(new PutObjectCommand({
    Bucket: STORAGE_BUCKET, Key: key, Body: buffer, ContentType: file.type || 'model/stl',
  }));
  // Compute the model volume so the quote's Mounting "Estimate from model" can price metal.
  const volumeCm3 = await stlVolumeCm3(arrayBuffer);
  const stl = {
    url: storageUrl(key), key, originalName: file.name || null,
    volumeCm3,
    uploadedBy: session.user.name || session.user.email || session.user.userID, uploadedAt: new Date(),
  };

  const piece = await PiecesModel.findById(wo.sourceID);
  if (piece) {
    const updates = { files: { ...(piece.files || {}), stl } };
    if (volumeCm3 != null) updates.printVolumeCm3 = volumeCm3;
    await PiecesModel.updateById(wo.sourceID, updates);
    // Surface the volume on the linked custom order so the Quote tab can read it.
    if (piece.customOrderID && volumeCm3 != null) {
      const order = await CustomOrdersModel.findById(piece.customOrderID);
      if (order) {
        await CustomOrdersModel.updateById(piece.customOrderID, {
          designModel: { ...(order.designModel || {}), stlVolumeCm3: volumeCm3 },
        });
      }
    }
  }

  const updated = await WorkOrdersModel.updateByID(workOrderID, {
    files: { ...(wo.files || {}), stl },
    status: 'QC',
    completedBy: session.user.name,
    completedAt: new Date(),
  });

  // X8 — STL design submitted for QC peer review: alert admins. Best-effort.
  try {
    const customID = piece?.customOrderID || (await customIDForWorkOrder(wo));
    await notifyAllAdmins({
      type: 'custom-design-submitted',
      title: 'Design submitted for QC review',
      message: `"${woLabel(wo)}"${customID ? ` (custom ${customID})` : ''} was submitted for CAD QC peer review.`,
      actionUrl: customID ? customLink(customID) : BENCH_ACTION_URL,
      priority: 'normal',
      relatedData: { customID: customID || null, workOrderID },
    });
  } catch (e) {
    console.error('⚠️ custom-design-submitted (STL) notify failed:', e?.message || e);
  }

  return updated;
}

/**
 * Upload the GLB for a CAD GLB-stage work order (C6d). GLB = the web-viewer model
 * (client review + efd-shop), made from the approved STL. Uploading completes the
 * GLB design step and moves the WO to QC. Sets files.glb on the WO + piece, and
 * propagates glbUrl onto the linked custom order's designModel (3D & Share / shop).
 * No hourly labor — the GLB fee is the CAD designer's flat fee (paid at QC, C6c).
 */
export async function uploadCadGlb({ session, workOrderID, file }) {
  const wo = await loadPieceWorkOrder(workOrderID);
  if (wo.discipline !== DISCIPLINE.CAD) {
    const e = new Error('GLB upload is only for CAD work orders.'); e.code = 'BAD_REQUEST'; throw e;
  }
  if (!isAdminRole(session) && wo.assignedToUserID && wo.assignedToUserID !== session.user.userID) {
    const e = new Error('Only the assigned designer can upload the GLB.'); e.code = 'FORBIDDEN'; throw e;
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const safe = (file.name || 'model.glb').replace(/[^a-zA-Z0-9.-]/g, '_');
  const key = `production/pieces/${wo.sourceID}/glb/${Date.now()}-${safe}`;
  await storageClient.send(new PutObjectCommand({
    Bucket: STORAGE_BUCKET, Key: key, Body: buffer, ContentType: file.type || 'model/gltf-binary',
  }));
  const glb = {
    url: storageUrl(key), key, originalName: file.name || null,
    uploadedBy: session.user.name || session.user.email || session.user.userID, uploadedAt: new Date(),
  };

  const piece = await PiecesModel.findById(wo.sourceID);
  if (piece) {
    await PiecesModel.updateById(wo.sourceID, { files: { ...(piece.files || {}), glb } });
    // Propagate the web model onto the custom order (3D & Share tab + efd-shop).
    if (piece.customOrderID) {
      const order = await CustomOrdersModel.findById(piece.customOrderID);
      if (order) {
        await CustomOrdersModel.updateById(piece.customOrderID, {
          designModel: { ...(order.designModel || {}), glbUrl: glb.url, meshMap: order.designModel?.meshMap || [] },
        });
      }
    }
  }

  // NOTE: uploading the GLB no longer auto-advances to QC. The GLB must have its
  // materials assigned first (meshMap → designModel via the Assign Materials studio
  // page), and submitCadGlbToQc() is what moves it to QC. Keep it IN PROGRESS here.
  return WorkOrdersModel.updateByID(workOrderID, {
    files: { ...(wo.files || {}), glb },
  });
}

/**
 * Submit a GLB-stage CAD work order to QC AFTER materials are assigned. The flow is
 * upload GLB → assign materials (meshMap saved to the order's designModel) → submit
 * to QC. Requires a GLB + a non-empty authored meshMap. No hourly labor (the CAD fee
 * is flat, paid at QC peer-review approval). Mirrors the old uploadCadGlb transition.
 */
export async function submitCadGlbToQc({ session, workOrderID }) {
  const wo = await loadPieceWorkOrder(workOrderID);
  if (wo.discipline !== DISCIPLINE.CAD) {
    const e = new Error('Submit-to-QC applies only to CAD work orders.'); e.code = 'BAD_REQUEST'; throw e;
  }
  if (!isAdminRole(session) && wo.assignedToUserID && wo.assignedToUserID !== session.user.userID) {
    const e = new Error('Only the assigned designer can submit this GLB to QC.'); e.code = 'FORBIDDEN'; throw e;
  }
  if (!wo.files?.glb?.url) {
    const e = new Error('Upload the GLB before submitting to QC.'); e.code = 'BAD_REQUEST'; throw e;
  }
  const piece = await PiecesModel.findById(wo.sourceID);
  const order = piece?.customOrderID ? await CustomOrdersModel.findById(piece.customOrderID) : null;
  if (!order?.designModel?.meshMap?.length) {
    const e = new Error('Assign materials to the model before submitting to QC.'); e.code = 'BAD_REQUEST'; throw e;
  }

  const updated = await WorkOrdersModel.updateByID(workOrderID, {
    status: 'QC',
    completedBy: session.user.name,
    completedAt: new Date(),
  });

  // X8 — GLB design submitted for QC peer review: alert admins that a CAD/GLB WO needs review.
  // Best-effort; never block the submit.
  try {
    await notifyAllAdmins({
      type: 'custom-design-submitted',
      title: 'Design submitted for QC review',
      message: `"${woLabel(wo)}"${order?.customID ? ` (custom ${order.customID})` : ''} was submitted for CAD QC peer review.`,
      actionUrl: order?.customID ? customLink(order.customID) : BENCH_ACTION_URL,
      priority: 'normal',
      relatedData: { customID: order?.customID || null, workOrderID },
    });
  } catch (e) {
    console.error('⚠️ custom-design-submitted (GLB) notify failed:', e?.message || e);
  }

  return updated;
}

/**
 * Split one task off a multi-task piece work order into its OWN work order, optionally
 * assigned to a specific jeweler. This is how different jewelers split a custom (e.g.
 * Vernon does the casting cleanup, you do the stone setting): each ends up on a separate
 * WO so each is credited their own labor at move-to-QC. Admin-only; can't split a WO
 * that's already in QC/completed or that has a single task. The new WO carries the moved
 * task (its hours → that jeweler's payout); the original keeps the rest.
 */
export async function splitPieceTask({ session, workOrderID, taskIndex, assignToUserID = null }) {
  if (!isAdminRole(session)) { const e = new Error('Only an admin can split/assign tasks.'); e.code = 'FORBIDDEN'; throw e; }
  const wo = await loadPieceWorkOrder(workOrderID);
  const tasks = Array.isArray(wo.tasks) ? wo.tasks : [];
  const idx = Number(taskIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= tasks.length) { const e = new Error('Invalid task index.'); e.code = 'BAD_REQUEST'; throw e; }
  if (tasks.length < 2) { const e = new Error('Nothing to split — this work order has a single task.'); e.code = 'BAD_REQUEST'; throw e; }
  if (['QC', 'COMPLETED', 'DELIVERED', 'CANCELLED'].includes(String(wo.status || '').toUpperCase())) {
    const e = new Error('Cannot split a work order that is in QC or completed.'); e.code = 'BAD_REQUEST'; throw e;
  }

  let assignedJeweler = null;
  if (assignToUserID) {
    const dbi = await db.connect();
    const u = await dbi.collection('users').findOne({ userID: assignToUserID }, { projection: { _id: 0, firstName: 1, lastName: 1, name: 1, email: 1 } });
    if (!u) { const e = new Error('Assignable artisan not found.'); e.code = 'NOT_FOUND'; throw e; }
    assignedJeweler = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.name || u.email || assignToUserID;
  }

  const task = tasks[idx];
  const piece = await PiecesModel.findById(wo.sourceID);
  const seq = (piece?.workOrderIDs?.length || 0) + 1;
  const newWo = await WorkOrdersModel.create({
    sourceType: wo.sourceType, sourceID: wo.sourceID, seq,
    discipline: wo.discipline, cadStage: null,
    title: task.process || wo.discipline,
    status: assignToUserID ? 'IN PROGRESS' : 'READY FOR WORK',
    assignedToUserID: assignToUserID || null, assignedJeweler,
    claimedAt: assignToUserID ? new Date() : null,
    tasks: [task],
    createdBy: session.user.userID || session.user.email || '',
  });
  await PiecesModel.setWorkOrders(wo.sourceID, [...(piece?.workOrderIDs || []), newWo.workOrderID]);
  await WorkOrdersModel.updateByID(workOrderID, { tasks: tasks.filter((_, i) => i !== idx) });

  // W1: an admin split-and-ASSIGNED this task to a specific artisan → notify them.
  // (An unassigned split goes to the open queue with no recipient, so skip that case.)
  try {
    if (assignToUserID) {
      await NotificationService.createNotification({
        userId: assignToUserID,
        type: 'wo-assigned',
        title: 'New work order assigned',
        message: `You've been assigned "${newWo.title || newWo.discipline}". It's ready on your bench.`,
        channels: ['inApp', 'email'],
        priority: 'normal',
        data: { actionUrl: BENCH_ACTION_URL },
      });
    }
  } catch (e) {
    console.error('[bench] wo-assigned (split) notify failed:', e?.message || e);
  }

  return { workOrder: newWo };
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

  // Author's CAD design fee → payable now that QC passed. Payer scope from the piece's owner.
  if (Number(wo.flatFee) > 0) {
    const cadScope = await resolvePieceLaborScope({ pieceID: wo.sourceID, laborerUserID: wo.assignedToUserID });
    await RepairLaborLogsModel.create({
      workOrderID, sourceType: wo.sourceType, sourceID: wo.sourceID,
      primaryJewelerUserID: wo.assignedToUserID, primaryJewelerName: wo.assignedJeweler,
      creditedLaborHours: 0, creditedValue: Number(wo.flatFee),
      sourceAction: 'cad_design_fee', requiresAdminReview: false,
      payer: cadScope.payer, payeeUserID: cadScope.payeeUserID,
    });
  }
  // Reviewer's flat QC review fee — charged ONCE per piece, not per CAD work order.
  // A piece can have several CAD WOs (STL for casting, GLB for the web viewer); the
  // QC review fee should only land once, so guard against an existing review log on
  // any of this piece's work orders before charging again.
  const dbInstance = await db.connect();
  const alreadyReviewed = await dbInstance.collection('laborLogs').findOne({
    sourceID: wo.sourceID, sourceAction: 'cad_qc_review',
  });
  if (!alreadyReviewed) {
    const qcReviewFee = await getQcReviewFee();
    await RepairLaborLogsModel.create({
      workOrderID, sourceType: wo.sourceType, sourceID: wo.sourceID,
      primaryJewelerUserID: session.user.userID, primaryJewelerName: session.user.name,
      creditedLaborHours: 0, creditedValue: qcReviewFee,
      sourceAction: 'cad_qc_review', requiresAdminReview: false,
      notes: 'CAD QC peer review.',
    });
  }

  const workOrder = await WorkOrdersModel.updateByID(workOrderID, {
    status: 'COMPLETED', qcBy: session.user.name, qcDate: new Date(),
  });
  const piece = await PiecesModel.recomputeCosts(wo.sourceID);

  // GLB passed QC → publish the customer share link so the approved design is viewable
  // in the efd-shop customs portal (+ the public /d/<token> page). Idempotent: reuse an
  // existing token (just enable it) rather than minting a new one. Never block QC on this.
  if (wo.cadStage === 'glb' && piece?.customOrderID) {
    try {
      const order = await CustomOrdersModel.findById(piece.customOrderID);
      if (order?.designModel?.glbUrl) {
        if (order.share?.token) {
          if (!order.share.enabled) await setShareEnabled(piece.customOrderID, true);
        } else {
          await createShareLink(piece.customOrderID);
        }
      }
    } catch (e) {
      console.warn('[customs] auto-share on GLB QC approval failed:', e.message);
    }
  }

  // W3: CAD QC passed → the author's flat design fee is now payable. Notify the author artisan.
  try {
    if (wo.assignedToUserID) {
      await NotificationService.createNotification({
        userId: wo.assignedToUserID,
        type: 'wo-completed',
        title: 'CAD work passed QC',
        message: `Your CAD work "${woLabel(wo)}" passed QC review — your design fee has been credited.`,
        channels: ['inApp'],
        priority: 'normal',
        data: { actionUrl: BENCH_ACTION_URL },
      });
    }
  } catch (e) {
    console.error('[bench] wo-completed (cad-qc) notify failed:', e?.message || e);
  }

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
  const updated = await WorkOrdersModel.updateByID(workOrderID, {
    status: 'IN PROGRESS', qcBy: null, qcDate: null,
    qcRejectedBy: session.user.name, qcRejectedAt: new Date(), qcRejectNotes: notes || '',
  });

  // W4: CAD QC failed → bounced back to the author for rework. Notify the author artisan.
  try {
    if (wo.assignedToUserID) {
      await NotificationService.createNotification({
        userId: wo.assignedToUserID,
        type: 'wo-qc-failed',
        title: 'CAD work needs rework',
        message: `Your CAD work "${woLabel(wo)}" was returned from QC${notes ? `: ${notes}` : '.'} Please revise and resubmit.`,
        channels: ['inApp'],
        priority: 'high',
        data: { actionUrl: BENCH_ACTION_URL },
      });
    }
  } catch (e) {
    console.error('[bench] wo-qc-failed (cad-qc) notify failed:', e?.message || e);
  }

  return updated;
}

/** Approve a piece work order out of QC — release held labor, finalize, re-roll COGS. */
export async function completePieceWorkOrderFromQc({ workOrderID }) {
  const wo = await loadPieceWorkOrder(workOrderID);
  await RepairLaborLogsModel.releasePendingQc(workOrderID); // QC passed → labor now payable
  const workOrder = await WorkOrdersModel.updateByID(workOrderID, {
    status: 'COMPLETED',
    qcDate: new Date(),
  });
  const piece = await PiecesModel.recomputeCosts(wo.sourceID);

  // W3: piece work order passed QC → held labor is now payable. Notify the assigned artisan.
  try {
    if (wo.assignedToUserID) {
      await NotificationService.createNotification({
        userId: wo.assignedToUserID,
        type: 'wo-completed',
        title: 'Work order passed QC',
        message: `Your work order "${woLabel(wo)}" passed QC — your labor has been credited.`,
        channels: ['inApp'],
        priority: 'normal',
        data: { actionUrl: BENCH_ACTION_URL },
      });
    }
  } catch (e) {
    console.error('[bench] wo-completed notify failed:', e?.message || e);
  }

  return { workOrder, piece };
}

export { DISCIPLINE };
