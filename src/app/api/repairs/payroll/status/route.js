/**
 * GET /api/repairs/payroll/status — what the payroll page's health card reads.
 *
 * Two questions, one call:
 *   "did payroll run?"            → the heartbeat each cron now stamps (services/payroll/cronHeartbeat.js),
 *                                   so a Wednesday that paid nobody says so instead of showing nothing.
 *   "how much do I need in Stripe?" → the projection the funding check already computes, against the
 *                                   live available balance. A Connect transfer can only spend balance
 *                                   that is already there, so this is the number that decides whether
 *                                   next Wednesday's run actually pays anyone.
 *
 * Stripe is best-effort: if it is unreachable the projection still renders, flagged, rather than
 * blanking the card.
 */
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { readPayrollRuns, nextRunAt } from '@/services/payroll/cronHeartbeat';
import { projectPayrollDue, readFundingSettings } from '@/services/payroll/payrollFunding';
import { isStripeConfigured, retrieveBalance, availableUsdCents, pendingUsdCents } from '@/lib/stripeConnect';

export const dynamic = 'force-dynamic';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export async function GET() {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const now = new Date();
  const [runs, due, funding] = await Promise.all([
    readPayrollRuns({ now }),
    projectPayrollDue().catch((e) => ({ error: e?.message || 'Could not project payroll', projected: 0, payees: [] })),
    readFundingSettings().catch(() => null),
  ]);

  let balance = null;
  if (isStripeConfigured()) {
    try {
      const b = await retrieveBalance();
      balance = { available: round2(availableUsdCents(b) / 100), pending: round2(pendingUsdCents(b) / 100) };
    } catch (error) {
      balance = { error: error?.message || 'Could not read the Stripe balance' };
    }
  }

  // What still has to reach Stripe before the next run can pay everyone. Pending card money is counted:
  // it settles into available on its own, and a few days is enough before Wednesday.
  const projected = round2(due?.projected || 0);
  const willHave = balance && !balance.error ? round2(balance.available + balance.pending) : null;
  const shortfall = willHave === null ? null : round2(Math.max(0, projected - willHave));

  return NextResponse.json({
    now,
    runs,
    nextPayrollRunAt: nextRunAt('weekly-payroll', now),
    due: { projected, finalizedTotal: round2(due?.finalizedTotal || 0), unbatchedTotal: round2(due?.unbatchedTotal || 0), payees: due?.payees || [], error: due?.error || null },
    balance,
    shortfall,
    funding: funding ? { enabled: funding.enabled === true, floor: funding.floor } : null,
    stripe: isStripeConfigured(),
  });
}
