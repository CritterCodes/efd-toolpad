/**
 * POST /api/time/manual — enter a shift that already happened. Admin/dev only.
 *
 * Body: { userID, hours } or { userID, startedAt, endedAt }, plus an optional note.
 *
 * For the hours somebody worked before anyone thought to press a button (owner, 2026-09-29: "I need
 * to be able to add the hours manually for her because she's already started working today"). The
 * shift is credited exactly like a clocked one — same labor log, same rate resolution, same route
 * onto payroll — and records who entered it.
 */
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import { userIdentityQuery } from '@/app/api/users/model';
import { addManualShift } from '@/services/time/timeClock';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const body = await req.json().catch(() => ({}));
  const userID = String(body?.userID || '').trim();
  if (!userID) return NextResponse.json({ error: 'Pick who worked the hours.' }, { status: 400 });

  try {
    // The name is read from the user record rather than trusted from the payload: it is stamped on
    // the labor log, and payroll groups people by what it finds there.
    const dbi = await db.connect();
    const user = await dbi.collection('users').findOne(
      userIdentityQuery(userID),
      { projection: { _id: 0, userID: 1, firstName: 1, lastName: 1, name: 1, email: 1 } },
    );
    if (!user) return NextResponse.json({ error: 'That person is not in the system.' }, { status: 404 });

    const result = await addManualShift({
      userID: user.userID,
      userName: [user.firstName, user.lastName].filter(Boolean).join(' ').trim() || user.name || user.email || user.userID,
      startedAt: body?.startedAt || null,
      endedAt: body?.endedAt || null,
      hours: body?.hours ?? null,
      note: body?.note || '',
      enteredBy: session.user.email || session.user.userID || '',
      session,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === 'BAD_REQUEST' ? 400 : 500 });
  }
}
