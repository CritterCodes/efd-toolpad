/**
 * Hourly time tracking — clock in, clock out, or enter a shift by hand (owner, 2026-09-29: an
 * apprentice on $15/hr, no set schedule, "just a clock-in/clock-out button for her").
 *
 * A FINISHED SHIFT IS A LABOR LOG. That is the whole design: payroll already batches unbatched labor
 * logs, Stripe Connect already pays those batches, and marking one paid in cash already records the
 * method. So clocking out writes the same kind of row QC pass writes, and every downstream thing —
 * the payroll page, the funding projection, the Connect payout, the 1099 summary — works with no new
 * payroll code at all.
 *
 * `timeEntries` is the timesheet: the in/out times, who entered them, and the log the shift produced.
 * The labor log is the ledger. Keeping both means an hour can be audited back to a clock press, and
 * payroll still has exactly one source of truth for money.
 *
 * THE RATE IS NEVER HARD-CODED (owner: "no hardcoding an hourly employee like that"). It comes from
 * `resolvePayRate` — the person's own `employment.hourlyRate`, else their tier on the published
 * ladder, else the shop rate — the same resolution every other payable hour in this system uses.
 * Setting her to $15 is a value on her user record, editable on the artisan page.
 */
import { db } from '@/lib/database';
import { randomUUID } from 'crypto';
import RepairLaborLogsModel from '@/app/api/repairLaborLogs/model';
import { getLaborRateSnapshotForUser } from '@/app/api/repairLaborLogs/utils';

const COLLECTION = 'timeEntries';
const MS_PER_HOUR = 3600000;

export const SHIFT_SOURCE = { CLOCK: 'clock', MANUAL: 'manual' };

/** Pure: hours between two instants, rounded to a hundredth, never negative. */
export function shiftHours(startedAt, endedAt) {
  const start = new Date(startedAt).getTime();
  const end = new Date(endedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.round(((end - start) / MS_PER_HOUR) * 100) / 100;
}

/** Pure: the money a shift is worth. */
export function shiftValue(hours, rate) {
  return Math.round((Number(hours) || 0) * (Number(rate) || 0) * 100) / 100;
}

async function collection() {
  const dbi = await db.connect();
  return dbi.collection(COLLECTION);
}

function err(message, code = 'BAD_REQUEST') {
  const e = new Error(message);
  e.code = code;
  return e;
}

/** The shift this person is currently on, or null. */
export async function openShiftFor(userID) {
  if (!userID) return null;
  const col = await collection();
  return col.findOne({ userID, endedAt: null }, { projection: { _id: 0 } });
}

/**
 * Start a shift. One at a time: a second clock-in returns the shift already running rather than
 * opening a parallel one, because two open shifts would pay the same hour twice.
 */
export async function clockIn({ userID, userName = '', startedAt = new Date(), note = '' } = {}) {
  if (!userID) throw err('A user is required to clock in.');
  const existing = await openShiftFor(userID);
  if (existing) return { started: false, reason: 'already clocked in', shift: existing };

  const shift = {
    shiftID: `shift-${randomUUID().slice(0, 8)}`,
    userID,
    userName,
    startedAt: new Date(startedAt),
    endedAt: null,
    hours: 0,
    rate: 0,
    value: 0,
    source: SHIFT_SOURCE.CLOCK,
    note: String(note || ''),
    logID: null,
    enteredBy: userID,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const col = await collection();
  await col.insertOne({ ...shift });
  return { started: true, shift };
}

/**
 * End the open shift and credit it. The rate is resolved AT CLOCK-OUT and snapshotted onto both the
 * timesheet row and the labor log, so a later change to her rate never rewrites hours already worked.
 */
export async function clockOut({ userID, endedAt = new Date(), note = '', session = null } = {}) {
  if (!userID) throw err('A user is required to clock out.');
  const shift = await openShiftFor(userID);
  if (!shift) return { ended: false, reason: 'not clocked in' };

  const hours = shiftHours(shift.startedAt, endedAt);
  if (hours <= 0) throw err('That shift is shorter than a minute — delete it instead of clocking out.');

  return creditShift({
    shift,
    endedAt: new Date(endedAt),
    hours,
    note: note || shift.note,
    session,
  });
}

/**
 * Enter a shift that already happened (owner: "I need to be able to add the hours manually for her
 * because she's already started working today"). Admin only — the route enforces that.
 */
export async function addManualShift({ userID, userName = '', startedAt, endedAt, hours = null, note = '', enteredBy = '', session = null } = {}) {
  if (!userID) throw err('A user is required.');

  const start = startedAt ? new Date(startedAt) : null;
  const end = endedAt ? new Date(endedAt) : null;
  const resolvedHours = Number(hours) > 0
    ? Math.round(Number(hours) * 100) / 100
    : (start && end ? shiftHours(start, end) : 0);
  if (!(resolvedHours > 0)) throw err('Enter either a start and end time, or a number of hours.');

  const shift = {
    shiftID: `shift-${randomUUID().slice(0, 8)}`,
    userID,
    userName,
    startedAt: start,
    endedAt: end,
    hours: resolvedHours,
    rate: 0,
    value: 0,
    source: SHIFT_SOURCE.MANUAL,
    note: String(note || ''),
    logID: null,
    enteredBy: enteredBy || '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const col = await collection();
  await col.insertOne({ ...shift });
  return creditShift({ shift, endedAt: end, hours: resolvedHours, note, session });
}

/**
 * Close a shift and write the labor log it earned. Shared by the clock and by manual entry so both
 * produce exactly the same payable row — a hand-entered hour is worth what a clocked hour is worth.
 */
async function creditShift({ shift, endedAt, hours, note = '', session = null }) {
  const rate = Number(await getLaborRateSnapshotForUser({ userID: shift.userID, session })) || 0;
  const value = shiftValue(hours, rate);

  const log = await RepairLaborLogsModel.create({
    primaryJewelerUserID: shift.userID,
    primaryJewelerName: shift.userName,
    creditedLaborHours: hours,
    laborRateSnapshot: rate,
    creditedValue: value,
    sourceType: 'shift',
    sourceID: shift.shiftID,
    sourceAction: 'hourly_shift',
    // An hour on the clock is payable on sight: there is no QC gate on time, and flagging it for
    // review would strand it out of payroll. A rate we could not resolve IS worth a look.
    pendingQc: false,
    requiresAdminReview: rate <= 0,
    notes: [note, rate <= 0 ? 'No hourly rate on file — set one before paying.' : ''].filter(Boolean).join(' '),
  });

  const col = await collection();
  const update = { endedAt: endedAt || null, hours, rate, value, logID: log.logID, note: String(note || shift.note || ''), updatedAt: new Date() };
  await col.updateOne({ shiftID: shift.shiftID }, { $set: update });

  return { ended: true, credited: true, shift: { ...shift, ...update }, log, needsRate: rate <= 0 };
}

/** Someone's shifts, newest first. */
export async function listShifts({ userID, limit = 50 } = {}) {
  const col = await collection();
  const query = userID ? { userID } : {};
  return col.find(query, { projection: { _id: 0 } }).sort({ startedAt: -1, createdAt: -1 }).limit(Math.min(Number(limit) || 50, 200)).toArray();
}

/** Pure-ish: hours and money in a set of shifts, for the card's running total. */
export function summarizeShifts(shifts = []) {
  const closed = shifts.filter((s) => s.endedAt || s.hours > 0);
  return {
    count: closed.length,
    hours: Math.round(closed.reduce((sum, s) => sum + (Number(s.hours) || 0), 0) * 100) / 100,
    value: Math.round(closed.reduce((sum, s) => sum + (Number(s.value) || 0), 0) * 100) / 100,
  };
}
