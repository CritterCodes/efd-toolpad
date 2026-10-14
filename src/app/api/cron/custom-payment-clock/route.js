/**
 * Cron: the pay-over-time monthly clock.
 * GET /api/cron/custom-payment-clock?secret=CRON_SECRET   (daily — see vercel.json)
 *
 * One digest reminder per client a week before and the day before each order's monthly due date;
 * on the first day past due the order is marked overdue, the client is told once and the admins are
 * alerted. Rules §9/§17; docs/manufacturing/PAY_OVER_TIME_CONTRACT.md §4. `?dryRun=1` writes nothing.
 */
import { runPaymentClock } from '@/services/customs/payOverTime';
import { cronAuthorized } from '@/lib/cronAuth';

export async function GET(req) {
  if (!cronAuthorized(req)) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const dryRun = new URL(req.url).searchParams.get('dryRun') === '1';
    const result = await runPaymentClock({ dryRun });
    return Response.json({ success: true, dryRun, ...result });
  } catch (e) {
    console.error('[cron] custom-payment-clock failed:', e?.message || e);
    return Response.json({ success: false, error: e?.message || 'payment clock failed' }, { status: 500 });
  }
}
