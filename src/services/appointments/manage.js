/**
 * Running the while-you-wait bench day.
 *
 * WHY THIS EXISTS
 * ---------------
 * efd-shop's /repair/wait sells booked bench slots to paid traffic. Those
 * bookings landed in the `appointments` collection and nothing in admin could
 * read them — no page, no component, no query. Someone could book Monday at 3pm
 * off an ad and the bench would have no idea they were coming.
 *
 * WHY DIRECTLY AGAINST MONGO
 * --------------------------
 * Shop owns the booking *rules* — slot generation, lead time, the uniqueness
 * index — and benchSlots.js already mirrors the parts admin needs. Routing these
 * reads through an HTTP call to shop would mean the shop floor cannot see who is
 * arriving whenever shop is down or slow, which is exactly backwards: seeing the
 * day is the critical path, and it should have the fewest moving parts.
 *
 * Customer email is the one thing that does cross over, because the templates
 * and NotificationService live in shop. It is best-effort and never blocks the
 * change — see notifyCustomer.
 */

import { db as database } from '@/lib/database';
import { REPAIR_STATUS } from '@/services/repairWorkflow';
import { convertLeadToRepair } from '@/services/repairs/leadQuote';
import RepairsModel from '@/app/api/repairs/model';
import {
  APPOINTMENTS,
  DEFAULT_CONFIG,
  isoDateInZone,
  loadAppointmentConfig,
  zonedToUtc,
} from './benchSlots';

const REPAIRS = 'repairs';

/** Statuses that still occupy the bench. Mirrors efd-shop lib/appointments.js. */
const BLOCKING_STATUSES = ['scheduled', 'confirmed', 'in-progress', 'blocked'];

/** "Mon, Aug 3 at 4:00 pm" — matches the wording the customer already saw. */
export function describeSlot(slotStart, timeZone = DEFAULT_CONFIG.timeZone) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(slotStart));
}

/**
 * Every booking between two dates, newest slot first, with the repair it came
 * from attached.
 *
 * The join is done here rather than with $lookup so a repair that was deleted
 * out from under an appointment shows the booking with `repair: null` instead of
 * dropping the row. An orphaned booking still occupies the bench, so the shop
 * needs to see it — silently hiding it is how a slot stays sold forever.
 */
export async function listAppointments({ fromISO, toISO } = {}) {
  const db = await database.connect();
  const config = await loadAppointmentConfig(db);

  const from = fromISO
    ? zonedToUtc(fromISO, '00:00', config.timeZone)
    : zonedToUtc(isoDateInZone(new Date(), config.timeZone), '00:00', config.timeZone);
  const to = toISO
    ? new Date(zonedToUtc(toISO, '00:00', config.timeZone).getTime() + 86_400_000)
    : new Date(from.getTime() + 86_400_000);

  const rows = await db
    .collection(APPOINTMENTS)
    .find({ slotStart: { $gte: from, $lt: to } })
    .sort({ slotStart: 1 })
    .toArray();

  const repairIDs = [...new Set(rows.map((r) => r.repairID).filter(Boolean))];
  const repairs = repairIDs.length
    ? await db
        .collection(REPAIRS)
        .find({ repairID: { $in: repairIDs } })
        .project({
          repairID: 1,
          clientName: 1,
          clientEmail: 1,
          clientPhone: 1,
          description: 1,
          status: 1,
          whileYouWait: 1,
          assignedTo: 1,
          quote: 1,
        })
        .toArray()
    : [];
  const byID = new Map(repairs.map((r) => [r.repairID, r]));

  return {
    timeZone: config.timeZone,
    appointments: rows.map((a) => ({
      appointmentID: a.appointmentID,
      slotStart: a.slotStart,
      slotEnd: a.slotEnd,
      when: describeSlot(a.slotStart, config.timeZone),
      status: a.status,
      active: a.active !== false,
      source: a.source || 'web',
      clientName: a.clientName || '',
      clientEmail: a.clientEmail || '',
      clientPhone: a.clientPhone || '',
      notes: a.notes || '',
      repairID: a.repairID || null,
      repair: a.repairID ? byID.get(a.repairID) || null : null,
    })),
  };
}

async function findActive(db, appointmentID) {
  const appt = await db.collection(APPOINTMENTS).findOne({ appointmentID });
  if (!appt) throw new Error('Appointment not found.');
  return appt;
}

/** Acknowledge a booking. Purely a status change; the slot was already held. */
export async function confirmAppointment(appointmentID) {
  const db = await database.connect();
  const appt = await findActive(db, appointmentID);
  await db.collection(APPOINTMENTS).updateOne(
    { appointmentID },
    { $set: { status: 'confirmed', active: true, updatedAt: new Date() } }
  );
  return { appointment: { ...appt, status: 'confirmed' }, notify: 'appointment_confirmed' };
}

/**
 * Move a booking to another slot.
 *
 * Writes the new slot before releasing the old one, so a clash leaves the
 * customer holding the time they already had. Doing it the other way round means
 * a failed reschedule silently loses their booking altogether.
 */
export async function rescheduleAppointment(appointmentID, { dateISO, hhmm }) {
  if (!dateISO || !hhmm) throw new Error('A new date and time are required.');
  const db = await database.connect();
  const config = await loadAppointmentConfig(db);
  const appt = await findActive(db, appointmentID);

  const slotStart = zonedToUtc(dateISO, hhmm, config.timeZone);
  // active:true is the index-backed source of truth; the status branch also
  // catches rows written before `active` existed. Requiring active:true at the
  // top level would make that second branch unreachable and let a legacy
  // `blocked` row be double-booked.
  const clash = await db.collection(APPOINTMENTS).findOne({
    slotStart,
    appointmentID: { $ne: appointmentID },
    $or: [{ active: true }, { status: { $in: BLOCKING_STATUSES } }],
  });
  if (clash) throw new Error('That slot is already taken.');

  const previous = appt.slotStart;
  await db.collection(APPOINTMENTS).updateOne(
    { appointmentID },
    {
      $set: {
        slotStart,
        slotEnd: new Date(slotStart.getTime() + config.durationMinutes * 60_000),
        scheduledDate: new Date(`${dateISO}T00:00:00.000Z`),
        startTime: hhmm,
        status: 'scheduled',
        active: true,
        updatedAt: new Date(),
        rescheduledFrom: previous,
      },
    }
  );

  return {
    appointment: { ...appt, slotStart },
    notify: 'appointment_rescheduled',
    previousWhen: describeSlot(previous, config.timeZone),
  };
}

/**
 * Give the slot back.
 *
 * `active: false` is what the unique partial index keys on, so clearing it frees
 * the hour for someone else the moment this returns.
 */
export async function cancelAppointment(appointmentID, reason = '') {
  const db = await database.connect();
  const appt = await findActive(db, appointmentID);
  await db.collection(APPOINTMENTS).updateOne(
    { appointmentID },
    {
      $set: {
        status: 'cancelled',
        active: false,
        cancelledAt: new Date(),
        cancellationReason: reason,
        updatedAt: new Date(),
      },
    }
  );
  return { appointment: { ...appt, status: 'cancelled' }, notify: 'appointment_cancelled' };
}

/**
 * They turned up. Turn the booking into work at the bench.
 *
 * This is the whole point of the flow: a web lead is a `repairs` row sitting in
 * LEAD status, and arriving is what promotes it to a real while-you-wait repair
 * with a jeweler against it. Without this the counter has to retype a repair
 * that already exists, and the lead and the work drift apart.
 *
 * The appointment stays `active` — the bench is genuinely occupied while they
 * are in the chair, and freeing the slot now would let the website sell the hour
 * out from under the person sitting in it.
 */
export async function markArrived(appointmentID, { assignedTo = null } = {}) {
  const db = await database.connect();
  const appt = await findActive(db, appointmentID);
  if (!appt.repairID) throw new Error('This booking has no repair attached.');

  const repair = await db.collection(REPAIRS).findOne({ repairID: appt.repairID });
  if (!repair) throw new Error('The repair for this booking no longer exists.');

  // Same conversion the leads list uses, so an accepted estimate's tasks and
  // totals land on the repair here too rather than only on the walk-in path.
  // While-you-wait is same-day by definition, so today is the promise date.
  const config = await loadAppointmentConfig(db);
  await convertLeadToRepair(appt.repairID, {
    status: REPAIR_STATUS.READY_FOR_WORK,
    promiseDate: isoDateInZone(new Date(), config.timeZone),
  });

  // Through the model, so the work-order mirror picks up assignedTo — writing
  // this raw would leave the bench showing the job as unclaimed after someone
  // had already been put on it.
  await RepairsModel.updateById(appt.repairID, {
    whileYouWait: true,
    ...(assignedTo ? { assignedTo } : {}),
    arrivedAt: new Date(),
    updatedAt: new Date(),
  });

  await db.collection(APPOINTMENTS).updateOne(
    { appointmentID },
    { $set: { status: 'in-progress', arrivedAt: new Date(), updatedAt: new Date() } }
  );

  return { repairID: appt.repairID, status: REPAIR_STATUS.READY_FOR_WORK };
}
