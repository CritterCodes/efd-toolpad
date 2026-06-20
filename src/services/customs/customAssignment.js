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
  await CustomOrdersModel.addAssignment(customID, assignment);

  if (assignment.role === ASSIGNMENT_ROLE.CAD) {
    // Fold the CAD designer's fee + the (paid) QC peer-review fee into the quote's
    // COG → markup (C4): the CAD design always goes through paid QC, so the client
    // is charged for it rather than the shop absorbing it. Both snapshot here.
    const qcFee = await qcReviewFeeSetting();
    await CustomOrdersModel.updateById(
      customID,
      { quote: { ...order.quote, designFee: feeSnapshot, qcReviewFee: qcFee, includeCustomDesign: feeSnapshot > 0 || qcFee > 0 } },
      { changedBy: assignedBy, reason: 'cad designer assigned' },
    );
    // Spawn the CAD work order on the designer's bench (C6); carry the flat
    // design fee so it can be logged into COGS when QC passes (C6c).
    await spawnCustomWorkOrder({
      customID, discipline: DISCIPLINE.CAD, cadStage: 'design', title: `${order.title || `Custom ${customID}`} — CAD (STL)`,
      assignedToUserID: userID, assignedJeweler: assignment.name, flatFee: feeSnapshot, createdBy: assignedBy,
    });
  }
  return CustomOrdersModel.findById(customID);
}

export async function removeAssignment({ customID, assignmentID }) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order) throw notFound('Custom order not found.');
  await CustomOrdersModel.removeAssignment(customID, assignmentID);
  return CustomOrdersModel.findById(customID);
}
