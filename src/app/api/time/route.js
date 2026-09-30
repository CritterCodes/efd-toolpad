/**
 * GET  /api/time            — my shifts (admin may pass ?userID= to see someone else's)
 * POST /api/time            — { action: 'in' | 'out', note? } for the signed-in person
 *
 * The timesheet half of hourly pay (services/time/timeClock.js). Clocking out credits the shift as a
 * labor log, which is what puts it on payroll.
 */
import { NextResponse } from 'next/server';
import { requireAuth, isAdmin } from '@/lib/apiAuth';
import { clockIn, clockOut, listShifts, openShiftFor, summarizeShifts } from '@/services/time/timeClock';
import { isOnTheClock, apprenticeErrorStatus } from '@/services/pay/apprentice';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  // Anyone may read their OWN timesheet; only an admin may read somebody else's.
  const asked = req.nextUrl?.searchParams?.get('userID') || '';
  const userID = asked && isAdmin(session) ? asked : session.user.userID;

  const [shifts, open, canClock] = await Promise.all([listShifts({ userID }), openShiftFor(userID), isOnTheClock(userID)]);
  // canClock: only people paid by the hour (apprentices) get a clock — services/pay/apprentice.js.
  return NextResponse.json({ userID, open, shifts, summary: summarizeShifts(shifts), canClock });
}

export async function POST(req) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const action = body?.action === 'out' ? 'out' : 'in';
  const userID = session.user.userID;
  const userName = session.user.name || session.user.email || userID;

  try {
    const result = action === 'in'
      ? await clockIn({ userID, userName, note: body?.note || '' })
      : await clockOut({ userID, note: body?.note || '', session });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: apprenticeErrorStatus(error) || (error.code === 'BAD_REQUEST' ? 400 : 500) });
  }
}
