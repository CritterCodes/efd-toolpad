/**
 * GET /api/cron/payroll-sweep   (Thursday 16:00 UTC = 11am Central — see vercel.json; the day after
 * Wednesday's payroll transfers clear)
 *
 * When funding is enabled and EFD's own Stripe payout schedule is MANUAL, pays out to the bank only
 * what sits above the payroll floor (services/payroll/payrollSweep.js). On an automatic schedule it
 * reports and moves nothing. `?dryRun=1` shows the numbers without a payout.
 */
import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/cronAuth';
import { runPayrollSweep } from '@/services/payroll/payrollSweep';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const dryRun = req.nextUrl?.searchParams?.get('dryRun') === '1';
    const result = await runPayrollSweep({ dryRun });
    return NextResponse.json({ ok: !result.error, ...result });
  } catch (error) {
    console.error('payroll-sweep cron failed:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Sweep failed' }, { status: 500 });
  }
}
