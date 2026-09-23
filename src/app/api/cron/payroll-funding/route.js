/**
 * GET /api/cron/payroll-funding   (daily 15:00 UTC = 10am Central — see vercel.json; daily-cadence payees draw every morning)
 *
 * Projects Wednesday's payroll, compares it with EFD's Stripe balance, and tops the balance up from
 * the business bank account when it falls short (services/payroll/payrollFunding.js). Stripe never
 * does that on its own. `?dryRun=1` reports the numbers without moving money.
 */
import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/cronAuth';
import { runFundingCheck } from '@/services/payroll/payrollFunding';
import { withHeartbeat } from '@/services/payroll/cronHeartbeat';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const dryRun = req.nextUrl?.searchParams?.get('dryRun') === '1';
    // A dry run reports; it is not a real run, so it leaves no heartbeat.
    const result = dryRun ? await runFundingCheck({ dryRun }) : await withHeartbeat('payroll-funding', () => runFundingCheck({}));
    return NextResponse.json({ ok: !result.error, ...result });
  } catch (error) {
    console.error('payroll-funding cron failed:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Funding check failed' }, { status: 500 });
  }
}
