/**
 * Terminate / reinstate a staff artisan's access — the one admin action behind the kill switch.
 *
 * Protocol (owner, 2026-09-21, after an artisan quit over a pay dispute and kept full access):
 *   1. Revoke  — status → 'terminated' (sign-in refuses it; accountRevocation signs out live
 *                sessions on their next request), every staff capability off, on-site off, push
 *                subscriptions dropped.
 *   2. Pay     — nothing here touches labor logs or payroll. Credited labor stays owed; the
 *                ledger is the record. Payroll is settled from the payroll page as usual.
 *   3. Work    — open BENCH repairs (claimed, not yet in QC) go back to the open queue with a
 *                note. Repairs already in QC stay assigned: the artisan did the work and QC pass
 *                must still credit them. Non-repair work orders (pieces/customs) are REPORTED,
 *                not moved — they have their own reassignment path.
 *   4. Profile — nothing is deleted. The name stays on every repair, labor log and payroll batch.
 *                Pickers and lists exclude `status: 'terminated'`.
 *   5. Record  — `termination` on the user doc: when, by whom, why, what was released, and the
 *                previous role/capabilities/employment so a reinstate is reviewable.
 *
 * Reinstate restores sign-in ONLY. Capabilities and on-site stay off and must be re-granted
 * explicitly through the normal capability route — coming back is not the same as never leaving.
 */
import { db } from '@/lib/database';
import RepairsModel from '@/app/api/repairs/model';
import { userIdentityQuery } from '@/app/api/users/model';
import { REPAIR_STATUS, buildUnclaimRepairUpdate } from '@/services/repairWorkflow';
import { forgetAccountState } from '@/services/users/accountRevocation';

export const TERMINATED_STATUS = 'terminated';

/** Bench states where the repair is claimed but the work is not yet in QC → release to the queue. */
export const RELEASABLE_REPAIR_STATUSES = Object.freeze([
  REPAIR_STATUS.READY_FOR_WORK,
  REPAIR_STATUS.IN_PROGRESS,
  REPAIR_STATUS.NEEDS_PARTS,
  REPAIR_STATUS.PARTS_ORDERED,
  REPAIR_STATUS.COMMUNICATION_REQUIRED,
]);

/** Work-order states that mean "done" — prod stores piece WOs UPPERCASE ('COMPLETED'), so both cases. */
export const FINISHED_WORK_ORDER_STATUSES = Object.freeze([
  'completed', 'COMPLETED', 'cancelled', 'CANCELLED', 'PAID_CLOSED', 'PICKED UP', 'DELIVERED', 'delivered',
]);

const PROTECTED_ROLES = Object.freeze(['admin', 'dev']);

function err(message, code) {
  const e = new Error(message);
  if (code) e.code = code;
  return e;
}

export function actorName(session = {}) {
  return session?.user?.name || session?.user?.email || session?.user?.userID || '';
}

/**
 * The `$set` that terminates an account. Pure. Dot-paths for `employment.isOnsite` so the
 * hourly rate (needed to price any labor still crediting at QC) survives — never replace the
 * subdocument (see memory: subdoc writes replace, not merge).
 */
export function buildTerminationUpdate({ user, actor = {}, reason = '', now = new Date(), releasedRepairIDs = [], openWorkOrderIDs = [] } = {}) {
  return {
    status: TERMINATED_STATUS,
    staffCapabilities: {},
    'employment.isOnsite': false,
    termination: {
      at: now,
      by: actor.userID || '',
      byName: actor.name || '',
      reason: String(reason || '').trim(),
      previous: {
        status: user?.status ?? null,
        role: user?.role ?? null,
        staffCapabilities: user?.staffCapabilities ?? null,
        employment: user?.employment ?? null,
      },
      releasedRepairIDs: [...releasedRepairIDs],
      openWorkOrderIDs: [...openWorkOrderIDs],
      reinstatedAt: null,
      reinstatedBy: '',
    },
    updatedAt: now,
  };
}

/** The `$set` that lets a terminated account sign in again. Access itself is NOT restored. Pure. */
export function buildReinstateUpdate({ actor = {}, now = new Date() } = {}) {
  return {
    status: 'verified',
    'termination.reinstatedAt': now,
    'termination.reinstatedBy': actor.userID || '',
    'termination.reinstatedByName': actor.name || '',
    updatedAt: now,
  };
}

/** Guard rails that don't need the database. Pure; throws with a code. */
export function assertTerminable({ user, session }) {
  if (!user) throw err('User not found.', 'NOT_FOUND');
  if (user.userID && user.userID === session?.user?.userID) throw err('You cannot terminate your own account.', 'BAD_REQUEST');
  if (PROTECTED_ROLES.includes(user.role)) throw err('Admin accounts are not terminated through this action.', 'FORBIDDEN');
  if (user.status === TERMINATED_STATUS) throw err('This account is already terminated.', 'BAD_REQUEST');
}

/**
 * What terminating this person would touch — shown in the confirm dialog and returned by the
 * action. Read-only.
 */
export async function previewTermination(userID) {
  const dbInstance = await db.connect();
  const [releasable, inQc, openWorkOrders, pushSubs] = await Promise.all([
    dbInstance.collection('repairs').find(
      { assignedTo: userID, status: { $in: RELEASABLE_REPAIR_STATUSES } },
      { projection: { _id: 0, repairID: 1, status: 1, clientName: 1, businessName: 1 } },
    ).toArray(),
    dbInstance.collection('repairs').countDocuments({ assignedTo: userID, status: REPAIR_STATUS.QC }),
    dbInstance.collection('workOrders').find(
      { assignedToUserID: userID, sourceType: { $ne: 'repair' }, status: { $nin: [...FINISHED_WORK_ORDER_STATUSES] } },
      { projection: { _id: 0, workOrderID: 1, sourceType: 1, sourceID: 1, title: 1, status: 1 } },
    ).toArray(),
    dbInstance.collection('pushSubscriptions').countDocuments({ userID }),
  ]);
  return { releasableRepairs: releasable, repairsInQc: inQc, openWorkOrders, pushSubscriptions: pushSubs };
}

export async function terminateArtisan({ userIdOrObjectId, session, reason = '' }) {
  const dbInstance = await db.connect();
  const users = dbInstance.collection('users');
  const user = await users.findOne(userIdentityQuery(userIdOrObjectId), { projection: { _id: 0, password: 0 } });
  assertTerminable({ user, session });

  const now = new Date();
  const actor = { userID: session?.user?.userID || '', name: actorName(session) };
  const preview = await previewTermination(user.userID);

  // 3. Release claimed bench work to the open queue, with a note on each repair.
  const releasedRepairIDs = [];
  for (const r of preview.releasableRepairs) {
    const repair = await RepairsModel.findById(r.repairID);
    const note = `Released to the open queue ${now.toISOString().slice(0, 10)}: ${user.firstName || ''} ${user.lastName || ''}`.trim()
      + `'s access was terminated${actor.name ? ` by ${actor.name}` : ''}.`;
    await RepairsModel.updateById(r.repairID, {
      ...buildUnclaimRepairUpdate({ now }),
      internalNotes: [repair?.internalNotes, note].filter(Boolean).join('\n'),
    });
    releasedRepairIDs.push(r.repairID);
  }

  // 1 + 5. Revoke and record.
  await users.updateOne(
    { userID: user.userID },
    { $set: buildTerminationUpdate({ user, actor, reason, now, releasedRepairIDs, openWorkOrderIDs: preview.openWorkOrders.map((w) => w.workOrderID) }) },
  );
  const pushResult = await dbInstance.collection('pushSubscriptions').deleteMany({ userID: user.userID });
  forgetAccountState(user.userID);

  return {
    userID: user.userID,
    terminatedAt: now,
    releasedRepairIDs,
    repairsInQc: preview.repairsInQc,
    openWorkOrders: preview.openWorkOrders,
    pushSubscriptionsRemoved: pushResult.deletedCount,
  };
}

export async function reinstateArtisan({ userIdOrObjectId, session }) {
  const dbInstance = await db.connect();
  const users = dbInstance.collection('users');
  const user = await users.findOne(userIdentityQuery(userIdOrObjectId), { projection: { _id: 0, userID: 1, status: 1 } });
  if (!user) throw err('User not found.', 'NOT_FOUND');
  if (user.status !== TERMINATED_STATUS) throw err('This account is not terminated.', 'BAD_REQUEST');

  await users.updateOne(
    { userID: user.userID },
    { $set: buildReinstateUpdate({ actor: { userID: session?.user?.userID || '', name: actorName(session) } }) },
  );
  forgetAccountState(user.userID);
  return { userID: user.userID, reinstated: true, accessRestored: false };
}
