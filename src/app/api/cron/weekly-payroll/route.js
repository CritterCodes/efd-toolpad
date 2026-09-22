/**
 * GET /api/cron/weekly-payroll   (Mondays 11:00 UTC = 6am Central — see vercel.json)
 *
 * Creates + finalizes every closed jeweler-week payroll batch, pays every payee with a live Stripe
 * Connect account (the only path — owner included), nudges anyone still unconnected, and tells
 * admins what happened. See services/payroll/autoPayroll.js.
 * Auth: Vercel's `Authorization: Bearer CRON_SECRET` header or `?secret=` for manual runs.
 * `?dryRun=1` reports what would happen without writing (candidates only).
 */
import { NextResponse } from 'next/server';
import { cronAuthorized } from '@/lib/cronAuth';
import { runWeeklyPayroll, lastClosedWeekStart } from '@/services/payroll/autoPayroll';
import { listPayrollCandidates } from '@/app/api/repairs/payroll/service';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  if (!cronAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    if (req.nextUrl?.searchParams?.get('dryRun') === '1') {
      const weekEnd = lastClosedWeekStart();
      const candidates = await listPayrollCandidates({ weekEnd });
      return NextResponse.json({ ok: true, dryRun: true, weekEnd, candidates });
    }
    const result = await runWeeklyPayroll();
    return NextResponse.json({ ok: result.errors.length === 0, ...result });
  } catch (error) {
    console.error('weekly-payroll cron failed:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Payroll run failed' }, { status: 500 });
  }
}
