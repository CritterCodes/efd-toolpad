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

export const ASSIGNMENT_ROLE = { CAD: 'cad', BENCH: 'bench' };

const ASSIGNABLE_QUERY = {
  role: { $in: ['artisan', 'senior-artisan'] },
  isApproved: { $ne: false },
  isActive: { $ne: false },
  status: { $nin: ['inactive', 'disabled', 'deleted'] },
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

/** Assign an artisan to a role; CAD assignments snapshot the fee into the quote. */
export async function assignArtisan({ customID, userID, role = ASSIGNMENT_ROLE.CAD, assignedBy = null }) {
  const order = await CustomOrdersModel.findById(customID);
  if (!order) throw notFound('Custom order not found.');

  const dbi = await db.connect();
  const user = await dbi.collection('users').findOne(
    { userID, ...ASSIGNABLE_QUERY },
    { projection: { _id: 0, userID: 1, firstName: 1, lastName: 1, name: 1, email: 1, artisanApplication: 1 } },
  );
  if (!user) throw notFound('Assignable artisan not found.');

  const feeSnapshot = role === ASSIGNMENT_ROLE.CAD ? (Number(user.artisanApplication?.customDesignFee) || 0) : 0;
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
    // Fold the CAD designer's fee into the quote's designFee → COG → markup (C4).
    if (feeSnapshot > 0) {
      await CustomOrdersModel.updateById(customID, { quote: { ...order.quote, designFee: feeSnapshot } }, { changedBy: assignedBy, reason: 'cad designer assigned' });
    }
    // Spawn the CAD work order on the designer's bench (C6); carry the flat
    // design fee so it can be logged into COGS when QC passes (C6c).
    await spawnCustomWorkOrder({
      customID, discipline: DISCIPLINE.CAD, title: `${order.title || `Custom ${customID}`} — CAD`,
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
