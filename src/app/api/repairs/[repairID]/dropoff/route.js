import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { canAccessLeads } from '@/lib/repairAccess';
import { convertLeadToRepair } from '@/services/repairs/leadQuote';

export const dynamic = 'force-dynamic';

/**
 * POST /api/repairs/{repairID}/dropoff
 *
 * The customer walked in with the piece. Promote the lead to a real repair,
 * carrying the quoted work if there was one.
 *
 * Gated on lead access rather than admin: the person taking a piece over the
 * counter is usually staff, and making them fetch the owner to press a button
 * is how work ends up logged late or not at all.
 */
export async function POST(request, { params }) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  if (!canAccessLeads(session)) {
    return NextResponse.json({ success: false, error: 'Not authorised.' }, { status: 403 });
  }

  const { repairID } = await params;
  const body = await request.json().catch(() => ({}));

  try {
    const result = await convertLeadToRepair(repairID, {
      status: body?.status || 'READY FOR WORK',
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('lead dropoff failed:', error?.message);
    return NextResponse.json({ success: false, error: error?.message || 'Failed.' }, { status: 400 });
  }
}
