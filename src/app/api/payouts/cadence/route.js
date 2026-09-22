/**
 * PATCH /api/payouts/cadence { userID, cadence: 'weekly' | 'daily' } — admin/dev grants a payee
 * daily payouts (services/payroll/payoutCadence.js). Weekly is free; daily nets Stripe's payout fee
 * plus EFD's flat fee out of each transfer.
 */
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { setCadence, CADENCES } from '@/services/payroll/payoutCadence';

export async function PATCH(req) {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const body = await req.json().catch(() => ({}));
  const userID = String(body?.userID || '').trim();
  if (!userID || !CADENCES.includes(body?.cadence)) {
    return NextResponse.json({ error: `userID and cadence (${CADENCES.join(' | ')}) are required.` }, { status: 400 });
  }
  const result = await setCadence({ userID, cadence: body.cadence, actor: session.user.email || session.user.userID });
  return NextResponse.json(result);
}
