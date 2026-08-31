import { NextResponse } from 'next/server';
import { requireStaffRepairsAccess } from '@/lib/apiAuth';
import {
  cancelAppointment,
  confirmAppointment,
  describeSlot,
  markArrived,
  rescheduleAppointment,
} from '@/services/appointments/manage';
import { notifyCustomer } from '@/services/appointments/notifyCustomer';

export const dynamic = 'force-dynamic';

/**
 * POST /api/appointments/{appointmentID}
 * body: { action: 'confirm' | 'reschedule' | 'cancel' | 'arrive', ... }
 *
 * One route rather than four, because these are all the same thing from the
 * counter's point of view — changing the state of a booking — and splitting
 * them would scatter the notification handling.
 *
 * Customer email is sent only for the three actions that change *their* plans.
 * Arrival is internal: they are standing in front of you.
 */
export async function POST(request, { params }) {
  const { errorResponse } = await requireStaffRepairsAccess();
  if (errorResponse) return errorResponse;

  const { appointmentID } = await params;
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON.' }, { status: 400 });
  }

  const action = String(body?.action || '');

  try {
    switch (action) {
      case 'confirm': {
        const { appointment } = await confirmAppointment(appointmentID);
        const notified = await notifyCustomer('confirmed', appointment, {
          when: describeSlot(appointment.slotStart),
        });
        return NextResponse.json({ success: true, notified });
      }

      case 'reschedule': {
        const { appointment, previousWhen } = await rescheduleAppointment(appointmentID, {
          dateISO: body?.date,
          hhmm: body?.time,
        });
        const notified = await notifyCustomer('rescheduled', appointment, {
          when: describeSlot(appointment.slotStart),
          previousWhen,
        });
        return NextResponse.json({ success: true, notified });
      }

      case 'cancel': {
        const { appointment } = await cancelAppointment(appointmentID, body?.reason || '');
        const notified = await notifyCustomer('cancelled', appointment, {
          when: describeSlot(appointment.slotStart),
          reason: body?.reason || '',
        });
        return NextResponse.json({ success: true, notified });
      }

      case 'arrive': {
        const result = await markArrived(appointmentID, { assignedTo: body?.assignedTo || null });
        return NextResponse.json({ success: true, ...result });
      }

      default:
        return NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 });
    }
  } catch (error) {
    // These are operator-facing messages ("That slot is already taken"), so they
    // are worth returning verbatim rather than flattening to a generic failure.
    console.error(`appointment ${action} failed:`, error?.message);
    return NextResponse.json({ success: false, error: error?.message || 'Action failed.' }, { status: 400 });
  }
}
