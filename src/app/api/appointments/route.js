import { NextResponse } from 'next/server';
import { requireStaffRepairsAccess } from '@/lib/apiAuth';
import { listAppointments } from '@/services/appointments/manage';

// Availability changes as people book. Never cache it.
export const dynamic = 'force-dynamic';

/**
 * GET /api/appointments?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * The bench day. Defaults to today when no range is given.
 *
 * Repair-ops access rather than admin-only: the people who need to know who is
 * walking in are the ones at the counter and the bench, not just the owner.
 */
export async function GET(request) {
  const { errorResponse } = await requireStaffRepairsAccess();
  if (errorResponse) return errorResponse;

  try {
    const { searchParams } = new URL(request.url);
    const data = await listAppointments({
      fromISO: searchParams.get('from') || undefined,
      toISO: searchParams.get('to') || undefined,
    });
    return NextResponse.json({ success: true, ...data });
  } catch (error) {
    console.error('appointment list failed:', error);
    return NextResponse.json(
      { success: false, error: 'Could not load the appointment list.' },
      { status: 500 }
    );
  }
}
