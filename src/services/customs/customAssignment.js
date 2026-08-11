/**
 * Custom-order artisan assignment (C5).
 *
 * Assigning a CAD designer is a QUOTING step: it snapshots the designer's own
 * fee (artisanApplication.customDesignFee) into the quote — where it folds into
 * the COG bucket (C4) — and records the assignment so the designer gets access
 * to the order's comms threads + info. The bench work-order spawn + CAD/STL/QC
 * lifecycle is wired in C6. See docs/manufacturing/customs-workflow.md §5.
 */
import { db } from '@/lib/database';
import { randomUUID } from 'crypto';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import { spawnCustomWorkOrder } from '@/services/customs/customProduction';
import { getCustomTaskLine, mergeAutoLaborLine } from '@/services/customs/customTasks';
import { DISCIPLINE } from '@/services/workOrders/disciplines';
import SettingsManagerService from '@/app/api/admin/settings/services/settingsManager.service';

export const ASSIGNMENT_ROLE = { CAD: 'cad', BENCH: 'bench' };

const DEFAULT_QC_REVIEW_FEE = 25;
async function qcReviewFeeSetting() {
  try {
    const s = await SettingsManagerService.getSettings();
    const fee = Number(s?.financial?.qcReviewFee);
    return fee >= 0 ? fee : DEFAULT_QC_REVIEW_FEE;
  } catch {
    return DEFAULT_QC_REVIEW_FEE;
  }
}

// Who can be assigned to a custom: the artisan roles, the in-house staff who also
// work the bench (admin/dev are the makers in this shop), and anyone of any role
// who holds an artisan application (e.g. an admin who is also an artisan).
const ASSIGNABLE_QUERY = {
  isApproved: { $ne: false },
  isActive: { $ne: false },
  status: { $nin: ['inactive', 'disabled', 'deleted'] },
  $or: [
    { role: { $in: ['artisan', 'senior-artisan', 'admin', 'dev'] } },
    { 'artisanApplication.artisanType': { $exists: true, $ne: null } },
  ],
};

function artisanName(u = {}) {
  return [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.name || u.email || u.userID;
}
function artisanTypeOf(u = {}) {
  const t = u.artisanApplication?.artisanType;
  return Array.isArray(t) ? t.join(', ') : (t || '');
}
function notFound(message) {
  const e = new Error(message);
  e.code = 'NOT_FOUND';
  return e;
}

/** Artisans eligible to be assigned, with their self-set CAD fee. */
export async function listAssignableArtisans() {
  const dbi = await db.connect();
  const users = await dbi.collection('users')
    .find(ASSIGNABLE_QUERY, { projection: { _id: 0, userID: 1, firstName: 1, lastName: 1, name: 1, email: 1, artisanApplication: 1 } })
    .toArray();
  return users
    .map((u) => ({ userID: u.userID, name: artisanName(u), artisanType: artisanTypeOf(u), customDesignFee: Number(u.artisanApplication?.customDesignFee) || 0 }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Assign an artisan to a role; CAD assignments snapshot the design fee into the
 * quote (folds into COG). `fee` overrides the designer's profile fee for this
 * custom (e.g. an admin-artisan with no profile fee, or a per-job rate).
 */
export async function assignArtisan({ customID, userID, role = ASSIGNMENT_ROLE.CAD, fee = null, assignedBy = null }) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order) throw notFound('Custom order not found.');

  const dbi = await db.connect();
  const user = await dbi.collection('users').findOne(
    { userID, ...ASSIGNABLE_QUERY },
    { projection: { _id: 0, userID: 1, firstName: 1, lastName: 1, name: 1, email: 1, artisanApplication: 1 } },
  );
  if (!user) throw notFound('Assignable artisan not found.');

  const profileFee = Number(user.artisanApplication?.customDesignFee) || 0;
  const overrideFee = fee === null || fee === '' ? null : Number(fee);
  const feeSnapshot = role === ASSIGNMENT_ROLE.CAD
    ? (Number.isFinite(overrideFee) && overrideFee >= 0 ? overrideFee : profileFee)
    : 0;
  const assignment = {
    id: randomUUID(),
    userID,
    name: artisanName(user),
    role: role === ASSIGNMENT_ROLE.BENCH ? ASSIGNMENT_ROLE.BENCH : ASSIGNMENT_ROLE.CAD,
    artisanType: artisanTypeOf(user),
    feeSnapshot,
    // Comms access: assigned artisans manage the client + see both threads.
    commsAccess: true,
    assignedAt: new Date(),
    assignedBy,
  };
  // ONE ARTISAN PER ROLE PER ORDER (owner, 2026-08-11: "I'm not sure there's ever really a case I
  // would need to assign a second jeweler"). A custom order can still have a CAD designer AND a bench
  // jeweler — those are different roles — but not two of either.
  //
  // For CAD this is a correctness guard, not just tidiness: a second CAD assignment silently spawned a
  // SECOND CAD work order on the same piece and overwrote the quote's designFee with the new
  // designer's. That is exactly what happened on CO-msp2z3jx-b313c5 — the second assignment set
  // designFee to 0, deleting it left the zero behind, and the order billed nothing for a $100 designer
  // who was still assigned. One design is one CAD file, the same invariant that keeps a wedding set as
  // two orders.
  //
  // Refusing beats reconciling: the operator is told at the point of the mistake instead of finding an
  // orphaned work order later. It is not a dead end either — the message says to remove the existing
  // assignment, which is how you change artisan.
  const existing = (order.assignments || []).find((a) => a.role === assignment.role);
  if (existing) {
    const label = assignment.role === ASSIGNMENT_ROLE.CAD ? 'CAD' : 'the bench';
    const err = new Error(
      `${existing.name || 'Someone'} is already assigned to ${label} on this order. `
      + 'Remove that assignment first if you are changing who works it.',
    );
    err.code = 'CONFLICT';
    throw err;
  }

  await CustomOrdersModel.addAssignment(customID, assignment);

  if (assignment.role === ASSIGNMENT_ROLE.CAD) {
    // The CAD designer's per-job fee snapshots into the quote (designFee → COG → markup).
    // The CAD design always goes through paid peer QC, so we ALSO add a "CAD QC Review"
    // labor line from the custom task catalog (priced like any task; falls back to the
    // qcReviewFee setting if the seed hasn't run). It's a labor line — not a separate
    // fee field — so QC is modeled as work, like the rest of the tasks.
    const qcFee = await qcReviewFeeSetting();
    const qcLine = await getCustomTaskLine('CAD QC Review', { autoKey: 'custom-qc', fallbackCost: qcFee });
    const laborTasks = mergeAutoLaborLine(order.quote?.laborTasks, qcLine);
    await CustomOrdersModel.updateById(
      customID,
      { quote: { ...order.quote, designFee: feeSnapshot, laborTasks, includeCustomDesign: feeSnapshot > 0 } },
      { changedBy: assignedBy, reason: 'cad designer assigned' },
    );
    // Spawn the CAD work order on the designer's bench (C6); carry the flat
    // design fee so it can be logged into COGS when QC passes (C6c).
    await spawnCustomWorkOrder({
      customID, discipline: DISCIPLINE.CAD, cadStage: 'design', title: `${order.title || `Custom ${customID}`} — CAD (STL)`,
      assignedToUserID: userID, assignedJeweler: assignment.name, flatFee: feeSnapshot, createdBy: assignedBy,
      // Stamp the assignment on the work order. Without it the two are unpairable — removing an
      // assignment had no way to find the work order it created, which is how an orphan CAD WO
      // survived a deleted assignment on CO-msp2z3jx-b313c5.
      assignmentId: assignment.id,
    });
  }
  return CustomOrdersModel.findById(customID);
}

/**
 * Remove an assignment AND everything assigning created.
 *
 * This used to `$pull` the assignment and stop. Assigning a CAD designer does three things — spawns a
 * CAD work order, snapshots the design fee into the quote, and adds a "CAD QC Review" labor line — and
 * none of them were reversed. The order kept billing a designer who was no longer on it, and the
 * orphaned work order sat on somebody's bench with no assignment behind it.
 *
 * The work order is CANCELLED rather than deleted when it already carries work (files, completion, a
 * QC verdict): the assignment was a mistake, but the work wasn't, and destroying the record of it
 * would lose the labor. An untouched one is deleted outright, since it never should have existed.
 */
export async function removeAssignment({ customID, assignmentID }) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order) throw notFound('Custom order not found.');

  const assignment = (order.assignments || []).find((a) => a.id === assignmentID);
  await CustomOrdersModel.removeAssignment(customID, assignmentID);

  if (assignment?.role === ASSIGNMENT_ROLE.CAD) {
    const cleanup = await releaseCadWorkOrder(order, assignment);

    // Reverse the quote edits assigning made. Another CAD designer should never exist (assignCustom
    // refuses one), so there is nothing to fall back to: the fee goes to zero and the auto QC line
    // goes with it, because QC exists to review THAT designer's CAD.
    const quote = order.quote || {};
    const laborTasks = (quote.laborTasks || []).filter((t) => t?.autoKey !== 'custom-qc');
    await CustomOrdersModel.updateById(
      customID,
      { quote: { ...quote, designFee: 0, includeCustomDesign: false, laborTasks } },
      { changedBy: 'system', reason: `cad designer unassigned (${cleanup})` },
    );
  }

  return CustomOrdersModel.findById(customID);
}

/** Cancel or delete the CAD work order this assignment spawned. Returns what it did. */
async function releaseCadWorkOrder(order, assignment) {
  try {
    const [{ default: WorkOrdersModel, WORK_ORDER_SOURCE }, { default: PiecesModel }] = await Promise.all([
      import('@/app/api/workOrders/model'),
      import('@/app/api/pieces/model'),
    ]);
    const pieceID = (order.pieceIDs || [])[0];
    if (!pieceID) return 'no piece';

    const all = await WorkOrdersModel.findBySource(WORK_ORDER_SOURCE.PRODUCTION_PIECE, pieceID);
    // Prefer the stamped link; fall back to the CAD design stage for work orders created before the
    // stamp existed — otherwise this fix cannot clean up the very orders that caused it.
    const wo = all.find((w) => w.assignmentId && w.assignmentId === assignment.id)
      || all.find((w) => w.discipline === 'cad' && w.cadStage === 'design' && w.status !== 'CANCELLED'
        && (w.assignedToUserID === assignment.userID));
    if (!wo) return 'no work order';

    const hasWork = Boolean(wo.completedAt) || Boolean(wo.qcBy)
      || Object.keys(wo.files || {}).length > 0 || (wo.tasks || []).length > 0;
    if (hasWork) {
      await WorkOrdersModel.updateByID(wo.workOrderID, {
        status: 'CANCELLED',
        cancelledReason: 'CAD assignment removed',
      });
      return `work order ${wo.workOrderID} cancelled (had work)`;
    }

    const dbi = await db.connect();
    await dbi.collection('workOrders').deleteOne({ workOrderID: wo.workOrderID });
    await dbi.collection('pieces').updateOne({ pieceID }, { $pull: { workOrderIDs: wo.workOrderID } });
    return `work order ${wo.workOrderID} removed`;
  } catch (e) {
    // Never block removing the assignment on cleanup: a stuck work order is visible and fixable, an
    // assignment you cannot remove is not.
    console.error('[customs] CAD work-order cleanup failed:', e?.message || e);
    return `cleanup failed: ${e?.message || e}`;
  }
}
