/**
 * Bench capacity for while-you-wait repairs.
 *
 * WHY THIS EXISTS
 * ---------------
 * efd-shop's /repair/wait sells a booked bench slot. It reads availability from
 * the `appointments` collection, so a slot is only free if nothing holds it.
 *
 * A walk-in never touched that collection: staff create a while-you-wait repair
 * at the counter and start work. The website has no idea the bench is busy and
 * will happily sell that same hour to someone else, who then arrives to a
 * jeweler mid-job. A calendar that is confidently wrong is worse than no
 * calendar.
 *
 * So when a while-you-wait repair is created without an appointment behind it,
 * we insert a `blocked` row for the hour it lands in. Staff do nothing
 * differently and web availability stays honest.
 *
 * SHARED SHAPE
 * ------------
 * efd-shop owns the canonical slot logic in its lib/appointments.js. Only the
 * parts admin needs are reproduced here: the config, the timezone maths, and
 * finding the slot that contains a given moment. Keep the two in step — a
 * mismatch in slotTimes or timeZone means the two apps disagree about which
 * hour is which, and the block lands on the wrong slot.
 */

// The lazily-instantiated singleton rather than `new Database()`: the Proxy
// defers construction so importing this module stays safe even if it is ever
// pulled transitively into a client bundle.
import { db as database } from '@/lib/database';

export const APPOINTMENTS = 'appointments';
const SETTINGS_ID = 'repair_appointment_settings';

/** Must match efd-shop lib/appointments.js DEFAULT_CONFIG. */
export const DEFAULT_CONFIG = {
  timeZone: 'America/Chicago',
  slotTimes: ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'],
  openDays: [1, 2, 3, 4, 5],
  durationMinutes: 60,
  minLeadMinutes: 120,
  horizonDays: 14,
};

export async function loadAppointmentConfig(db) {
  try {
    const doc = await db.collection('adminSettings').findOne({ _id: SETTINGS_ID });
    return { ...DEFAULT_CONFIG, ...(doc?.config || {}) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

function zoneOffsetMs(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
    .formatToParts(date)
    .reduce((acc, p) => ((acc[p.type] = p.value), acc), {});

  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second)
  );
  return asUTC - date.getTime();
}

/** Local wall-clock time in a zone as a real UTC instant. Two passes for DST. */
export function zonedToUtc(dateISO, hhmm, timeZone) {
  const [y, m, d] = dateISO.split('-').map(Number);
  const [hh, mi] = hhmm.split(':').map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mi, 0, 0);
  let instant = new Date(naive - zoneOffsetMs(new Date(naive), timeZone));
  instant = new Date(naive - zoneOffsetMs(instant, timeZone));
  return instant;
}

/** YYYY-MM-DD as seen in the zone. */
export function isoDateInZone(date, timeZone) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * The slot whose hour contains `at`, or null if it falls outside the working
 * slots — lunch, before opening, after close. Nothing to block in that case.
 */
export function slotContaining(at, config) {
  const dateISO = isoDateInZone(at, config.timeZone);
  const windowMs = config.durationMinutes * 60_000;

  for (const hhmm of config.slotTimes) {
    const start = zonedToUtc(dateISO, hhmm, config.timeZone);
    if (at >= start && at < new Date(start.getTime() + windowMs)) {
      return { dateISO, hhmm, slotStart: start, slotEnd: new Date(start.getTime() + windowMs) };
    }
  }
  return null;
}

/**
 * Hold the current hour against a walk-in.
 *
 * Never throws. A repair that already exists must not be undone because the
 * calendar bookkeeping failed — same reasoning as the while-you-wait labor log
 * a few lines above the call site.
 *
 * A duplicate-key rejection is not an error: it means the hour was already
 * spoken for, by a web booking or an earlier walk-in. Worth surfacing to
 * whoever is at the counter, because it means someone may be about to arrive
 * expecting that bench.
 *
 * @returns {Promise<{blocked:boolean, reason?:string, slot?:string, conflict?:boolean}>}
 */
export async function blockSlotForWalkIn(repair, { at = new Date() } = {}) {
  try {
    if (!repair?.repairID || repair.whileYouWait !== true) {
      return { blocked: false, reason: 'not-a-while-you-wait-repair' };
    }

    const db = await database.connect();
    const col = db.collection(APPOINTMENTS);

    // Same self-heal as efd-shop's booking path. A block that lands in a
    // database without the unique index protects nothing and says nothing.
    try {
      await col.createIndex(
        { slotStart: 1 },
        { unique: true, partialFilterExpression: { active: true }, name: 'uniq_active_slot' }
      );
    } catch (indexError) {
      console.error('CRITICAL: appointment uniqueness index missing —', indexError?.message);
    }

    // Booked online? Then the slot is already held and this isn't a walk-in.
    const existing = await col.findOne({ repairID: repair.repairID, active: true });
    if (existing) return { blocked: false, reason: 'already-has-appointment' };

    const config = await loadAppointmentConfig(db);
    const slot = slotContaining(at, config);
    if (!slot) return { blocked: false, reason: 'outside-bench-hours' };

    await col.insertOne({
      appointmentID: `appt-walkin-${repair.repairID.slice(-8)}`,
      type: 'while-you-wait-repair',
      title: 'Walk-in (bench busy)',
      status: 'blocked',
      active: true,
      source: 'walkin',
      repairID: repair.repairID,
      clientName: repair.clientName || '',
      slotStart: slot.slotStart,
      slotEnd: slot.slotEnd,
      scheduledDate: new Date(`${slot.dateISO}T00:00:00.000Z`),
      startTime: slot.hhmm,
      duration: config.durationMinutes,
      timeZone: config.timeZone,
      notes: 'Auto-blocked: walk-in occupying the bench.',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return { blocked: true, slot: slot.hhmm };
  } catch (error) {
    if (error?.code === 11000) {
      // Already held — the bench was double-committed. Real, and worth knowing.
      return { blocked: false, conflict: true, reason: 'slot-already-held' };
    }
    console.error('walk-in slot block failed (non-fatal):', error?.message);
    return { blocked: false, reason: 'error' };
  }
}
