/**
 * Cron: release scheduled drops whose moment has arrived.
 * GET /api/cron/release-drops?secret=CRON_SECRET   (every 5 minutes — see vercel.json)
 *
 * A SCHEDULED drop used to sit at "scheduled" forever: nothing in the system ever looked at
 * `releaseAt`. This is the clock. Five-minute granularity is deliberate — a drop that says
 * 3:10 should go live at 3:10-ish, not on the hour.
 *
 * `?dryRun=1` reports what WOULD release without publishing anything.
 */
import { releaseDueDrops } from '@/services/production/dropRelease';
import { cronAuthorized } from '@/lib/cronAuth';

export async function GET(req) {
  if (!cronAuthorized(req)) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  const dryRun = ['1', 'true'].includes((req.nextUrl.searchParams.get('dryRun') || '').toLowerCase());

  try {
    const result = await releaseDueDrops({ dryRun });
    if (result.refused.length) {
      // A due drop that cannot release is the loudest thing this job can find: the owner
      // scheduled it expecting it to go live.
      console.error('[cron] release-drops refused:',
        result.refused.map((r) => `${r.name || r.dropId}: ${r.error}`).join('; '));
    }
    if (result.released) {
      console.log(`[cron] release-drops released ${result.released} drop(s)`);
    }
    return Response.json({ success: true, dryRun, ...result });
  } catch (e) {
    console.error('[cron] release-drops failed:', e?.message || e);
    return Response.json({ success: false, error: e?.message || 'release failed' }, { status: 500 });
  }
}
