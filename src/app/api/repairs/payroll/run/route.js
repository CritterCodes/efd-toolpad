/**
 * POST /api/repairs/payroll/run — run the weekly payroll job now, by hand.
 *
 * The same work Wednesday's cron does (services/payroll/autoPayroll.js): create and finalize every
 * closed week's batch, then pay every finalized batch whose payee has a live Stripe Connect account.
 * It exists because the cron fires once and the money it spends might not have landed yet — a payout
 * that found the balance short leaves the batch FINALIZED, and rather than wait for the next daily
 * retry you can press this the moment the funds arrive (owner, 2026-09-29: "just a little bit of an
 * assurance").
 *
 * Safe to press twice. `runWeeklyPayroll` skips a jeweler-week that already has an open batch, batched
 * labor logs stop being payroll candidates, and each Connect transfer carries an idempotency key — so
 * a second run pays the people the first one could not, and nobody twice.
 *
 * Stamped through the same heartbeat as the cron, so the health card above the button shows the manual
 * run exactly as it shows a scheduled one.
 */
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { runWeeklyPayroll } from '@/services/payroll/autoPayroll';
import { withHeartbeat } from '@/services/payroll/cronHeartbeat';

export const dynamic = 'force-dynamic';

export async function POST() {
  const { session, errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  try {
    const actor = session.user.email || session.user.userID || 'admin';
    const result = await withHeartbeat('weekly-payroll', () => runWeeklyPayroll({ createdBy: actor }));
    return NextResponse.json({ ok: (result.errors || []).length === 0, ranBy: actor, ...result });
  } catch (error) {
    console.error('manual payroll run failed:', error);
    return NextResponse.json({ ok: false, error: error?.message || 'Payroll run failed' }, { status: 500 });
  }
}
