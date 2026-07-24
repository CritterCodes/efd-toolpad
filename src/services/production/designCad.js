import { db } from '@/lib/database';
import WorkOrdersModel, { WORK_ORDER_SOURCE } from '@/app/api/workOrders/model';
import DesignsModel, { DESIGN_STATUS } from '@/app/api/designs/model';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import { DISCIPLINE, canClaimDiscipline } from '@/services/workOrders/disciplines';
import { resolveDesignLaborScope } from '@/services/production/laborPayer';

/**
 * Request-CAD on-ramp (PRODUCTION_RUNS.md §2 stage 1). A `cad`-discipline work order spawned FROM a
 * design (sourceType `cad_request`, sourceID = designID) drives the design's
 * cad_requested → cad_in_progress → cad_qc → ready lifecycle. This is the on-ramp the docs flagged
 * as missing ("Design CAD statuses exist, nothing drives them").
 *
 * A deliberate PARALLEL path to the piece-CAD bench actions: those key on a Piece via wo.sourceID
 * and mirror assets onto a custom order, so a design-sourced WO can't reuse them without breaking
 * that coupling. This module is design-coupled and leaves the live piece/customs CAD flow untouched.
 *
 * Fee: the CAD flat fee is the designer's own `artisanApplication.customDesignFee` (self-set on the
 * profile), quoted and ACCEPTED at WO creation (§4c) — the acceptance is stamped on the WO.
 */

export class DesignCadError extends Error {}

/** PURE — assignment + initial statuses for a new request. Solo → self-assigned + in-progress. */
export function cadRequestPlan({ solo = true, createdBy = null }) {
  if (solo && createdBy) {
    return { assignedToUserID: createdBy, woStatus: 'IN PROGRESS', designStatus: DESIGN_STATUS.CAD_IN_PROGRESS, claimed: true };
  }
  return { assignedToUserID: null, woStatus: 'READY FOR WORK', designStatus: DESIGN_STATUS.CAD_REQUESTED, claimed: false };
}

/** The designer's self-set CAD flat fee (mirrors customProduction's fee resolution). */
export async function resolveDesignCadFee(designerUserID) {
  if (!designerUserID) return 0;
  try {
    const dbInstance = await db.connect();
    const u = await dbInstance.collection('users').findOne(
      { userID: designerUserID },
      { projection: { artisanApplication: 1 } },
    );
    return Number(u?.artisanApplication?.customDesignFee) || 0;
  } catch {
    return 0;
  }
}

async function loadDesignCadWorkOrder(workOrderID) {
  const wo = await WorkOrdersModel.findByID(workOrderID);
  if (!wo) throw new DesignCadError('Work order not found.');
  if (wo.sourceType !== WORK_ORDER_SOURCE.CAD_REQUEST) throw new DesignCadError('Not a design CAD work order.');
  return wo;
}

/**
 * Create the Request-CAD work order on a design. `acceptedFee` is what the requester agreed to
 * (defaults to the assigned designer's profile fee); it's stamped with who/when for the audit.
 */
export async function requestDesignCad({ designID, createdBy, solo = true, assignToUserID = null, sketchUrl = null, acceptedFee = null, notes = null }) {
  const design = await DesignsModel.findById(designID);
  if (!design) throw new DesignCadError('Design not found.');
  const existing = await WorkOrdersModel.findOneBySource(WORK_ORDER_SOURCE.CAD_REQUEST, designID);
  if (existing && existing.status !== 'CANCELLED') throw new DesignCadError('A CAD request already exists for this design.');

  const plan = cadRequestPlan({ solo, createdBy });
  // Explicit assignee overrides the solo default (direct-assign to a specific CAD designer).
  const assignedToUserID = assignToUserID || plan.assignedToUserID;
  const designerForFee = assignedToUserID || createdBy;
  const fee = acceptedFee != null ? Number(acceptedFee) || 0 : await resolveDesignCadFee(designerForFee);
  const claimed = Boolean(assignedToUserID);

  const wo = await WorkOrdersModel.create({
    sourceType: WORK_ORDER_SOURCE.CAD_REQUEST,
    sourceID: designID,
    discipline: DISCIPLINE.CAD,
    cadStage: 'design',
    title: `CAD — ${design.name || designID}`,
    description: notes ?? null,
    status: claimed ? 'IN PROGRESS' : 'READY FOR WORK',
    assignedToUserID: assignedToUserID || null,
    claimedAt: claimed ? new Date() : null,
    flatFee: fee,
    files: sketchUrl ? { sketch: { url: sketchUrl } } : {},
    createdBy,
  });
  // Stamp the accepted quote (§4c — "the person creating the WO needs to know what they're getting into").
  await WorkOrdersModel.updateByID(wo.workOrderID, {
    quoteAcceptedFee: fee, quoteAcceptedBy: createdBy ?? null, quoteAcceptedAt: new Date(),
  });

  const designStatus = claimed ? DESIGN_STATUS.CAD_IN_PROGRESS : DESIGN_STATUS.CAD_REQUESTED;
  await DesignsModel.updateById(designID, { status: designStatus });
  return { workOrder: await WorkOrdersModel.findByID(wo.workOrderID), designStatus };
}

/** Claim a queued design CAD WO (outsourced path). Lane-enforced to CAD designers. */
export async function claimDesignCad({ session, workOrderID }) {
  const wo = await loadDesignCadWorkOrder(workOrderID);
  const artisanTypes = session?.user?.artisanTypes;
  const isAdmin = ['admin', 'dev', 'staff'].includes(session?.user?.role);
  if (!isAdmin && !canClaimDiscipline(artisanTypes, DISCIPLINE.CAD)) {
    throw new DesignCadError('Only CAD designers can claim CAD work.');
  }
  if (wo.assignedToUserID && wo.assignedToUserID !== session.user.userID) {
    throw new DesignCadError('Work order already claimed.');
  }
  const updated = await WorkOrdersModel.updateByID(workOrderID, {
    status: 'IN PROGRESS', assignedToUserID: session.user.userID,
    assignedJeweler: session.user.name, claimedAt: new Date(),
  });
  await DesignsModel.updateById(wo.sourceID, { status: DESIGN_STATUS.CAD_IN_PROGRESS });
  return updated;
}

/** Land the CAD deliverables on the DESIGN and move to QC. */
export async function submitDesignCadToQc({ session, workOrderID, stlUrl = null, glbUrl = null, stlVolumeCm3 = null }) {
  const wo = await loadDesignCadWorkOrder(workOrderID);
  if (!stlUrl && !glbUrl && !wo.files?.stl && !wo.files?.glb) {
    throw new DesignCadError('Upload the STL or GLB before submitting to QC.');
  }
  const designPatch = { status: DESIGN_STATUS.CAD_QC };
  if (stlUrl) designPatch.stlUrl = stlUrl;
  if (glbUrl) designPatch['designModel.glbUrl'] = glbUrl;
  if (stlVolumeCm3 != null) designPatch.stlVolumeCm3 = Number(stlVolumeCm3) || 0;
  await DesignsModel.updateById(wo.sourceID, designPatch);

  const files = { ...(wo.files || {}) };
  if (stlUrl) files.stl = { url: stlUrl };
  if (glbUrl) files.glb = { url: glbUrl };
  return WorkOrdersModel.updateByID(workOrderID, {
    status: 'QC', files, completedBy: session?.user?.name ?? null, completedAt: new Date(),
  });
}

/**
 * Approve a design CAD WO out of QC. Peer review (author ≠ reviewer) for EFD-paid work; solo work
 * self-certifies at the WO (§3 — standards review then happens at drop release, which is staff-only).
 * Logs the author's CAD flat fee (payer scope from the design owner) and flips the design to ready.
 */
export async function approveDesignCad({ session, workOrderID }) {
  const wo = await loadDesignCadWorkOrder(workOrderID);
  const author = wo.assignedToUserID;
  const reviewer = session?.user?.userID;
  const selfCertified = Boolean(author && reviewer && author === reviewer);

  if (Number(wo.flatFee) > 0 && author) {
    const scope = await resolveDesignLaborScope({ designID: wo.sourceID, laborerUserID: author });
    await RepairLaborLogsModel.create({
      workOrderID, sourceType: wo.sourceType, sourceID: wo.sourceID,
      primaryJewelerUserID: author, primaryJewelerName: wo.assignedJeweler,
      creditedLaborHours: 0, creditedValue: Number(wo.flatFee),
      sourceAction: 'cad_design_fee', requiresAdminReview: false,
      payer: scope.payer, payeeUserID: scope.payeeUserID,
      notes: selfCertified ? 'Self-certified (solo) — EFD standards review at release.' : 'Peer-reviewed CAD.',
    });
  }
  const updated = await WorkOrdersModel.updateByID(workOrderID, {
    status: 'COMPLETED', qcBy: session?.user?.name ?? null, qcDate: new Date(), selfCertified,
  });
  await DesignsModel.updateById(wo.sourceID, { status: DESIGN_STATUS.READY });
  return updated;
}

/** Kick a design CAD WO back for rework. */
export async function rejectDesignCad({ session, workOrderID, notes = null }) {
  const wo = await loadDesignCadWorkOrder(workOrderID);
  const updated = await WorkOrdersModel.updateByID(workOrderID, {
    status: 'IN PROGRESS', qcBy: session?.user?.name ?? null, qcNotes: notes ?? null,
  });
  await DesignsModel.updateById(wo.sourceID, { status: DESIGN_STATUS.CAD_IN_PROGRESS });
  return updated;
}
