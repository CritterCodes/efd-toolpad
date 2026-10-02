/**
 * Who may claim a repair, and who may send one to QC (EFD-DEFECTS B2, B3; 2026-10-01).
 *
 * The UI only SHOWS Claim on unclaimed cards and Move to QC on your own, but the routes behind them checked
 * nothing: scanning a ticket that was in QC, completed or still being received pulled it back onto the bench as
 * IN PROGRESS; scanning someone else's job took it; and any bench worker could send an unclaimed repair, or
 * another jeweler's, to QC (moveRepairToQc stamps the tasks to the assignee — or to the clicker when there is
 * none). These are the rules, pure, so every entry point (the bench card, the scan, the Move page) applies the
 * same ones: buildClaim's two callers check claimRefusal, and moveRepairToQc — the one function all QC moves
 * go through — checks sendToQcRefusal.
 */
import { normalizeRepairStatus, REPAIR_STATUS } from '@/services/repairWorkflow';

/** An Error carrying a code the bench route maps to a status (CONFLICT → 409, FORBIDDEN → 403). */
export function benchRuleError(message, code) {
  const e = new Error(message);
  e.code = code;
  e.status = code === 'FORBIDDEN' ? 403 : 409;
  return e;
}

/**
 * Pure: why this person may NOT claim this repair, or null if they may.
 *   - only READY FOR WORK can be claimed (claiming a job in QC, completed or receiving is never right)
 *   - already yours: fine (a re-scan is a no-op)
 *   - held by someone else (IN PROGRESS, or READY FOR WORK with an assignee): admins only — a takeover
 */
export function claimRefusal(repair = {}, { userID, isAdmin = false } = {}) {
  const status = normalizeRepairStatus(repair.status);
  const holder = repair.assignedTo || null;
  if (holder && holder === userID && [REPAIR_STATUS.READY_FOR_WORK, REPAIR_STATUS.IN_PROGRESS].includes(status)) return null;
  if (status === REPAIR_STATUS.IN_PROGRESS) {
    // IN PROGRESS with nobody holding it is effectively unclaimed (none in production 2026-10-01, but not wrong).
    if (!holder) return null;
    return isAdmin ? null : { code: 'FORBIDDEN', message: `${repair.repairID} is already on ${repair.assignedJeweler || 'another jeweler'}'s bench.` };
  }
  if (status !== REPAIR_STATUS.READY_FOR_WORK) {
    return { code: 'CONFLICT', message: `${repair.repairID} can't be claimed: it's ${repair.status || 'not ready for work'}.` };
  }
  if (holder && !isAdmin) {
    return { code: 'FORBIDDEN', message: `${repair.repairID} is held by ${repair.assignedJeweler || 'another jeweler'}.` };
  }
  return null;
}

/**
 * Pure: why this person may NOT send this repair to QC, or null if they may.
 *   - only bench work (READY FOR WORK / IN PROGRESS) goes to QC
 *   - the holder sends it; an admin may send it on a jeweler's behalf, or their own unclaimed work
 *   - a non-admin can't send an unclaimed job (it would be credited to them) or someone else's
 */
export function sendToQcRefusal(repair = {}, { userID, isAdmin = false } = {}) {
  const status = normalizeRepairStatus(repair.status);
  if (![REPAIR_STATUS.READY_FOR_WORK, REPAIR_STATUS.IN_PROGRESS].includes(status)) {
    return { code: 'CONFLICT', message: `${repair.repairID} can't go to QC: it's ${repair.status || 'not on the bench'}.` };
  }
  if (isAdmin) return null;
  if (!repair.assignedTo) return { code: 'FORBIDDEN', message: `${repair.repairID} isn't claimed — claim it before sending it to QC.` };
  if (repair.assignedTo !== userID) return { code: 'FORBIDDEN', message: `${repair.repairID} is ${repair.assignedJeweler || 'another jeweler'}'s — only they (or an admin) can send it to QC.` };
  return null;
}

/**
 * Pure: did this person do any of the work on this repair? The holder, and anyone a task is signed off
 * to — a handoff chain means several people can have touched it, and all of them are the author for the
 * purposes of reviewing it.
 */
export function didTheWork(repair = {}, userID) {
  if (!userID) return false;
  if (repair.assignedTo === userID) return true;
  return (repair.tasks || []).some((task) => task?.completedByUserID === userID);
}

/**
 * Pure: why this person may NOT pass this repair's QC, or null if they may (EFD-DEFECTS B6).
 *
 * `separate` mode exists to mean peer review: bench → Move to QC → someone else passes it. The route
 * behind the QC tab only ever checked the `qualityControl` capability, so a jeweler holding both
 * capabilities could pass their own repair there — the same act the shop switches to `self-certify`
 * to allow, but without the stamp that keeps it auditable.
 *
 * Production is in self-certify mode (owner, 2026-09-22), so this refusal is dormant today; it is the
 * rule that has to hold the day a second jeweler makes `separate` mean something. Admins are exempt,
 * as everywhere else on the bench — their pass is stamped instead, by `qcPassIsSelfCertified`.
 */
export function qcPassRefusal(repair = {}, { userID, isAdmin = false, mode = 'separate' } = {}) {
  if (mode === 'self-certify') return null;
  if (isAdmin) return null;
  if (!didTheWork(repair, userID)) return null;
  return {
    code: 'FORBIDDEN',
    message: `You worked on ${repair.repairID}, so you can't pass its QC. Ask someone else to check it, or switch the shop to self-certify QC in Settings.`,
  };
}

/** Pure: a pass by someone who did the work is a self-certification, whichever button was pressed. */
export function qcPassIsSelfCertified(repair = {}, userID) {
  return didTheWork(repair, userID);
}
