/**
 * Cron: Monday email to the admins listing this week's pay-over-time chores — stones to check,
 * stones to buy, overdue payments, orders ready for production, mountings that can't follow the
 * metal market. Silent when there is nothing to do.
 * GET /api/cron/pay-over-time-weekly?secret=CRON_SECRET   (Mondays — see vercel.json)
 */
import { sendWeeklyChores } from '@/services/customs/payOverTime';
import { cronAuthorized } from '@/lib/cronAuth';

export async function GET(req) {
  if (!cronAuthorized(req)) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const dryRun = new URL(req.url).searchParams.get('dryRun') === '1';
    const result = await sendWeeklyChores({ dryRun });
    return Response.json({ success: true, dryRun, ...result });
  } catch (e) {
    console.error('[cron] pay-over-time-weekly failed:', e?.message || e);
    return Response.json({ success: false, error: e?.message || 'weekly digest failed' }, { status: 500 });
  }
}
