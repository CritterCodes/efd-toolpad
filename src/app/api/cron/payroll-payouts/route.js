/**
 * GET /api/cron/payroll-payouts   (daily 12:00 UTC — see vercel.json)
 *
 * Pays every FINALIZED payroll batch whose payee has a connected Stripe account with auto-pay on.
 * Runs daily (not just Mondays) so a batch that waited on EFD's balance, or a payee who finished
 * Stripe onboarding mid-week, gets paid without anyone remembering. Idempotent per batch.
 */
import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/cronAuth';
import { runConnectPayouts } from '@/services/payroll/connectPayouts';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const result = await runConnectPayouts();
    return NextResponse.json({ ok: result.errors.length === 0, ...result });
  } catch (error) {
    console.error('payroll-payouts cron failed:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Payout run failed' }, { status: 500 });
  }
}
