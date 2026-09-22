/**
 * POST /api/payouts/connect/dashboard { userID? } → one-time login link into the payee's Stripe
 * Express dashboard (bank account, payout history). Self, or admin/dev for anyone.
 */
import { NextResponse } from 'next/server';
import { requireAuth, isAdmin } from '@/lib/apiAuth';
import { connectDashboardLink } from '@/services/payroll/connectPayouts';

export async function POST(req) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const body = await req.json().catch(() => ({}));
  const userID = String(body?.userID || '').trim() || session.user.userID;
  if (userID !== session.user.userID && !isAdmin(session)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const url = await connectDashboardLink({ userID });
    return NextResponse.json({ url });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === 'NOT_FOUND' ? 404 : 502 });
  }
}
