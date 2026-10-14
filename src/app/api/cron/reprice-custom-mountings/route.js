/**
 * Cron: an over-time order's UNPAID mounting follows the metal market.
 * GET /api/cron/reprice-custom-mountings?secret=CRON_SECRET   (daily — see vercel.json)
 *
 * Owner ruling 2026-10-14 (Q22, docs/OPEN-QUESTIONS.md): checked daily, re-priced only when metal has
 * moved 5% or more since the mounting was priced, client emailed; a paid stage never changes.
 * `?dryRun=1` reports what would change without writing or emailing. services/customs/payOverTime.
 */
import { repriceOverTimeMountings } from '@/services/customs/payOverTime';
import { cronAuthorized } from '@/lib/cronAuth';

export async function GET(req) {
  if (!cronAuthorized(req)) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const dryRun = new URL(req.url).searchParams.get('dryRun') === '1';
    const result = await repriceOverTimeMountings({ dryRun });
    return Response.json({ success: true, dryRun, ...result });
  } catch (e) {
    console.error('[cron] reprice-custom-mountings failed:', e?.message || e);
    return Response.json({ success: false, error: e?.message || 'reprice failed' }, { status: 500 });
  }
}
