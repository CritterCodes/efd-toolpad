/**
 * Stripe Connect for payees (services/payroll/connectPayouts.js).
 *
 *   GET  /api/payouts/connect[?userID=]   → live status for the caller (admins may ask about anyone)
 *   POST /api/payouts/connect  { userID? } → create the Express account if needed, return onboarding URL
 *
 * Any signed-in user may connect THEMSELVES; only admin/dev may act for another user.
 */
import { NextResponse } from 'next/server';
import { requireAuth, isAdmin } from '@/lib/apiAuth';
import { adminBase } from '@/lib/appUrls';
import { refreshConnectStatus, startConnectOnboarding } from '@/services/payroll/connectPayouts';
import { isStripeConfigured, stripeMode } from '@/lib/stripeConnect';

export const dynamic = 'force-dynamic';

function targetUser(session, requested) {
  const self = session.user.userID;
  const target = String(requested || '').trim() || self;
  if (target !== self && !isAdmin(session)) return null;
  return target;
}

export async function GET(req) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const userID = targetUser(session, req.nextUrl.searchParams.get('userID'));
  if (!userID) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (!isStripeConfigured()) return NextResponse.json({ configured: false, connected: false, mode: 'unconfigured' });
  try {
    const status = await refreshConnectStatus({ userID });
    return NextResponse.json({ configured: true, mode: stripeMode(), userID, ...status });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status === 404 ? 404 : 500 });
  }
}

export async function POST(req) {
  const { session, errorResponse } = await requireAuth();
  if (errorResponse) return errorResponse;
  const body = await req.json().catch(() => ({}));
  const userID = targetUser(session, body?.userID);
  if (!userID) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  // Payees land back on THEIR payroll page; an admin acting for someone lands on the admin payroll page.
  const base = adminBase();
  const returnTo = userID === session.user.userID && !isAdmin(session)
    ? `${base}/dashboard/artisan/payroll`
    : `${base}/dashboard/repairs/payroll`;
  try {
    const result = await startConnectOnboarding({
      userID,
      returnUrl: `${returnTo}?connect=return`,
      refreshUrl: `${returnTo}?connect=refresh`,
    });
    return NextResponse.json(result);
  } catch (error) {
    const status = error.code === 'STRIPE_UNCONFIGURED' ? 503 : error.code === 'NOT_FOUND' ? 404 : 502;
    return NextResponse.json({ error: error.message, code: error.code || '' }, { status });
  }
}
