/**
 * Bench-native repair handoff (per-task sign-off). A jeweler holding a repair checks off
 * the tasks they completed and hands the rest off — to a named jeweler or back to the open
 * queue. Signing off only STAMPS the tasks (who did them + a rate snapshot); no labor log is
 * written here. Labor is credited later, once the repair passes QC (see creditRepairLaborAtQc
 * in benchActions). Attribution uses the work order's ASSIGNED jeweler, not the clicker, so an
 * admin signing off / handing off on a jeweler's behalf credits the jeweler.
 */
import { db } from '@/lib/database';
import RepairsModel from '@/app/api/repairs/model';
import { NotificationService } from '@/lib/notificationService';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import {
  buildMoveToQcUpdate,
  buildAssignBenchUpdate,
  buildUnclaimRepairUpdate,
} from '@/services/repairWorkflow';
import {
  getUncreditedTaskIndexes,
  getLaborRateSnapshotForUser,
  groupCompletedTasksByJeweler,
  calculateRepairLaborHours,
  calculateRepairChargeTotal,
} from '@/app/api/repairLaborLogs/utils';

const QC_PASS_ACTION = 'repair_qc_pass';

function err(message, code) {
  const e = new Error(message);
  if (code) e.code = code;
  return e;
}

function jewelerName(user = {}) {
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.name || user.email || user.userID;
}

/**
 * Sign off the completed tasks (credited to the repair's assigned jeweler) and route the
 * remainder. Returns the updated repair.
 *   - no tasks left  → move to QC (auto)
 *   - tasks left + assignToUserID → reassign to that jeweler (NOT flagged for review)
 *   - tasks left + no target       → release to the open bench queue
 */
export async function signOffAndHandoffRepair({ session, repairID, completedTaskIndexes = [], assignToUserID = null }) {
  const repair = await RepairsModel.findById(repairID);
  if (!repair) throw err('Repair not found.', 'NOT_FOUND');

  const assigneeID = repair.assignedTo;
  if (!assigneeID) throw err('Repair must be claimed before signing off work.', 'BAD_REQUEST');

  const uncredited = new Set(getUncreditedTaskIndexes(repair));
  const indexes = [...new Set((completedTaskIndexes || []).map(Number))].filter((i) => uncredited.has(i));
  if (!indexes.length) throw err('Select at least one un-signed-off task you completed.', 'BAD_REQUEST');

  // Snapshot the assigned jeweler's rate at sign-off (fair: the rate when the work was done).
  const rate = Number(await getLaborRateSnapshotForUser({ userID: assigneeID, session })) || 0;
  const now = new Date();
  const stampSet = new Set(indexes);
  const tasks = (repair.tasks || []).map((task, i) => (
    stampSet.has(i)
      ? { ...task, completedByUserID: assigneeID, completedByName: repair.assignedJeweler || assigneeID, completedAt: now, laborRateSnapshot: rate }
      : task
  ));

  const remaining = tasks.reduce((acc, task, i) => {
    if (!task?.completedByUserID) acc.push(i);
    return acc;
  }, []);

  let routeUpdate;
  let handoffTarget = null;
  if (remaining.length === 0) {
    // Everything is done → straight to QC. The repair-level completedBy reflects the actor.
    routeUpdate = buildMoveToQcUpdate({ userName: session.user.name, now });
  } else if (assignToUserID) {
    const dbInstance = await db.connect();
    const next = await dbInstance.collection('users').findOne(
      { userID: assignToUserID },
      { projection: { _id: 0, userID: 1, firstName: 1, lastName: 1, name: 1, email: 1 } },
    );
    if (!next) throw err('Hand-off jeweler not found.', 'NOT_FOUND');
    handoffTarget = next;
    routeUpdate = buildAssignBenchUpdate({
      repair, userID: next.userID, userName: jewelerName(next), now, requiresLaborReview: false,
    });
  } else {
    routeUpdate = buildUnclaimRepairUpdate({ now });
  }

  const result = await RepairsModel.updateById(repairID, { tasks, ...routeUpdate });

  // R8 — bench handoff: notify the target artisan the repair was handed off to them
  // (best-effort, in-app + push). Only fires when a specific target jeweler was set.
  if (handoffTarget?.userID) {
    try {
      const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || '';
      await NotificationService.createNotification({
        userId: handoffTarget.userID,
        type: 'repair-handoff',
        title: 'Repair handed off to you',
        message: `A repair has been handed off to you${result?.clientName ? ` (${result.clientName})` : ''} to finish the remaining tasks.`,
        channels: ['inApp'],
        priority: 'normal',
        data: {
          actionUrl: `${adminUrl}/dashboard/repairs/${repairID}`,
          repairID,
          clientName: result?.clientName || '',
        },
      });
    } catch (notifyError) {
      console.error('R8 repair-handoff notification failed (non-fatal):', notifyError.message);
    }
  }

  return result;
}

/**
 * Credit repair labor when it passes QC — the single place a repair's labor logs are
 * created. Groups the per-task sign-off stamps by jeweler (one payable log each), so a
 * handed-off repair pays each jeweler for the tasks they did. Falls back to crediting the
 * whole repair to the assignee when there are no stamps (legacy repairs / claim-overs that
 * skipped the handoff flow) — preserving prior behavior + the admin labor-review safety net.
 * Idempotent: re-running QC pass won't double-credit.
 */
export async function creditRepairLaborAtQc({ repair, session }) {
  const existing = await RepairLaborLogsModel.findByRepair(repair.repairID);
  if (existing.some((l) => l.sourceAction === QC_PASS_ACTION)) return { created: 0 };

  let groups = groupCompletedTasksByJeweler(repair, { finalMoverUserID: repair.assignedTo });
  if (!groups.length) {
    const uid = repair.assignedTo || session?.user?.userID;
    if (!uid) return { created: 0 };
    groups = [{ userID: uid, name: repair.assignedJeweler || session?.user?.name || uid, hours: calculateRepairLaborHours(repair), rate: 0 }];
  }

  // Price each jeweler's bucket (backfill the rate if the stamp didn't capture one).
  const priced = [];
  for (const g of groups) {
    const rate = g.rate > 0 ? g.rate : Number(await getLaborRateSnapshotForUser({ userID: g.userID, session })) || 0;
    priced.push({ ...g, rate, value: Math.round(g.hours * rate * 100) / 100 });
  }

  // Review guards (mirror the legacy move-to-QC checks), applied across the repair.
  const chargeTotal = calculateRepairChargeTotal(repair);
  const totalHours = priced.reduce((s, p) => s + p.hours, 0);
  const totalPay = priced.reduce((s, p) => s + p.value, 0);
  const sharedFlag = repair.requiresLaborReview === true;
  const zeroHoursOnChargeable = chargeTotal > 0 && totalHours <= 0;
  const payExceedsTicket = chargeTotal > 0 && totalPay > chargeTotal;

  let created = 0;
  for (const p of priced) {
    const notes = [];
    if (sharedFlag) notes.push('Shared-work repair requires admin labor review.');
    if (p.rate <= 0) notes.push('Missing hourly rate snapshot. Confirm pay rate before payout.');
    if (zeroHoursOnChargeable) notes.push('Chargeable repair has no labor hours. Confirm hours before payout.');
    if (payExceedsTicket) notes.push(`Labor pay ${totalPay.toFixed(2)} exceeds repair total ${chargeTotal.toFixed(2)}.`);
    await RepairLaborLogsModel.create({
      repairID: repair.repairID,
      primaryJewelerUserID: p.userID,
      primaryJewelerName: p.name,
      creditedLaborHours: p.hours,
      laborRateSnapshot: p.rate,
      creditedValue: p.value,
      sourceAction: QC_PASS_ACTION,
      requiresAdminReview: sharedFlag || p.rate <= 0 || zeroHoursOnChargeable || payExceedsTicket,
      notes: notes.join(' '),
    });
    created += 1;
  }
  return { created };
}
