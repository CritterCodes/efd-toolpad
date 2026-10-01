import { assertCanHoldWork } from '@/services/pay/apprentice';
import { db } from '@/lib/database';
import PiecesModel from '@/app/api/pieces/model';
import WorkOrdersModel from '@/app/api/workOrders/model';
import { NotificationService } from '@/lib/notificationService';
import { DISCIPLINE } from '@/services/workOrders/disciplines';
import { resolvePieceLaborScope } from '@/services/production/laborPayer';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import { setShareEnabled } from '@/services/customs/customViewer';
import { createShareLink } from '@/services/customs/customViewer';
import { maybeCompleteCustomOrder } from '@/services/customs/customStatus';
import { BENCH_ACTION_URL, getQcReviewFee, isAdminRole, loadPieceWorkOrder, woLabel } from './shared';
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
    await assertCanHoldWork(assignToUserID, { who: 'other' });
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
  //
  // GUARDED against a second approval of the same work order, exactly as the QC review fee below is.
  // Nothing stops approveCadQc running twice — loadPieceWorkOrder checks existence and discipline, not
  // status — and the realistic trigger is a retry: billing fails transiently, staff see the error and
  // click Approve again. Unguarded, that writes a SECOND cad_design_fee, which double-credits the
  // author in payroll, inflates piece COGS, and (since billableLabor sums the logs) raises an invoice
  // for twice the fee. The invoice dedupe can't help — the whole scenario begins with no invoice.
  const alreadyPaidDesignFee = Number(wo.flatFee) > 0
    ? await (await db.connect()).collection('laborLogs').findOne({ workOrderID, sourceAction: 'cad_design_fee' })
    : null;
  if (Number(wo.flatFee) > 0 && !alreadyPaidDesignFee) {
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
    // Resolve the payer for the REVIEWER's labor the same way the design fee does, instead of letting
    // the model default it to 'efd'. The rule is mechanical (laborPayer.js): 'self' only when the
    // laborer IS the piece's owning artisan.
    //
    // This is not cosmetic. Self-review is blocked for the AUTHOR, but an owner who outsourced the CAD
    // may review it themselves — and the default billed them, through the wholesale markup, for their
    // own labour on their own piece. That is renting on self-work, which is exactly what EFD doesn't do.
    //
    // What it does NOT change: a solo artisan whose CAD is reviewed by EFD staff still pays the review
    // fee. The reviewer's time is genuinely EFD-paid labour on that artisan's piece — facilitated
    // infrastructure, the thing EFD does charge for — so 'efd' is the correct answer there.
    const reviewScope = await resolvePieceLaborScope({ pieceID: wo.sourceID, laborerUserID: session.user.userID });
    await RepairLaborLogsModel.create({
      workOrderID, sourceType: wo.sourceType, sourceID: wo.sourceID,
      primaryJewelerUserID: session.user.userID, primaryJewelerName: session.user.name,
      creditedLaborHours: 0, creditedValue: qcReviewFee,
      sourceAction: 'cad_qc_review', requiresAdminReview: false,
      payer: reviewScope.payer, payeeUserID: reviewScope.payeeUserID,
      notes: 'CAD QC peer review.',
    });
  }

  const workOrder = await WorkOrdersModel.updateByID(workOrderID, {
    status: 'COMPLETED', qcBy: session.user.name, qcDate: new Date(),
  });
  const piece = await PiecesModel.recomputeCosts(wo.sourceID);

  // Bill the owning artisan, exactly as completePieceWorkOrderFromQc does (U-BILL-2). This path also
  // completes a piece work order carrying EFD-paid labor — the cad_design_fee and cad_qc_review logs
  // written above — so leaving it out would mean whether an artisan is charged depends on WHICH button
  // staff click. Ordered after the status write and non-throwing for the same reason: QC pass is a
  // committed money event (that labor is now payable) and a billing failure must not undo it.
  const { billCompletedWorkOrder } = await import('@/services/production/workOrderBilling');
  const billing = await billCompletedWorkOrder({ workOrderID, createdBy: session.user.userID });

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

  // A late CAD approval (e.g. the GLB pass) can be the last open work order on a custom
  // order whose bench work already finished. The guard inside makes the design-phase
  // approval — where the CAD WO is the ONLY one so far — a no-op.
  try {
    if (piece?.customOrderID) await maybeCompleteCustomOrder(piece.customOrderID);
  } catch (e) {
    console.error('[bench] custom-order completion check failed:', e?.message || e);
  }

  // Same shape as completePieceWorkOrderFromQc: both QC paths now bill, so both report it.
  return { workOrder, piece, billing };
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

