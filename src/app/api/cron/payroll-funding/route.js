/**
 * GET /api/cron/payroll-funding   (Thursdays 15:00 UTC = 10am Central — see vercel.json)
 *
 * Projects Monday's payroll, compares it with EFD's Stripe balance, and tops the balance up from
 * the business bank account when it falls short (services/payroll/payrollFunding.js). Stripe never
 * does that on its own. `?dryRun=1` reports the numbers without moving money.
 */
import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/cronAuth';
import { runFundingCheck } from '@/services/payroll/payrollFunding';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  if (!cronAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const dryRun = req.nextUrl?.searchParams?.get('dryRun') === '1';
    const result = await runFundingCheck({ dryRun });
    return NextResponse.json({ ok: !result.error, ...result });
  } catch (error) {
    console.error('payroll-funding cron failed:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Funding check failed' }, { status: 500 });
  }
}
