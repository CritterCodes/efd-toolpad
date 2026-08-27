/**
 * Cron: reprice every sellable listing off today's metal
 * GET /api/cron/reprice-listings?secret=CRON_SECRET   (daily 10:00 UTC — see vercel.json)
 *
 * Runs an hour AFTER `update-metal-prices` (09:00) so the day's rates are in before the
 * first read freezes them into `metalPriceSnapshots`. Owner ruling 2026-08-25: everything
 * for sale is repriced daily — design-backed listings recompute cost and price from the
 * day's metal, made pieces get a formula on their fixed COGS. See services/production/dailyReprice.
 *
 * `?dryRun=1` reports what WOULD change without writing — use it before trusting a run.
 */
import { repriceListings } from '@/services/production/dailyReprice';

export async function GET(req) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  const dryRun = ['1', 'true'].includes((req.nextUrl.searchParams.get('dryRun') || '').toLowerCase());

  try {
    const result = await repriceListings({ dryRun });
    if (!result.ok) {
      // A refusal (no metal rates) is not a crash, but it must not read as success —
      // a silent "0 updated" is exactly how a storefront goes stale unnoticed.
      console.error('[cron] reprice-listings refused:', result.reason);
      return Response.json({ success: false, ...result }, { status: 503 });
    }
    if (result.skipped.length) {
      console.warn(`[cron] reprice-listings skipped ${result.skipped.length} listing(s):`,
        result.skipped.map((s) => `${s.productId}: ${s.reason}`).join('; '));
    }
    return Response.json({ success: true, dryRun, ...result });
  } catch (e) {
    console.error('[cron] reprice-listings failed:', e?.message || e);
    return Response.json({ success: false, error: e?.message || 'reprice failed' }, { status: 500 });
  }
}
