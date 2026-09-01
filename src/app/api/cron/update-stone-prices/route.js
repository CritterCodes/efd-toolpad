/**
 * Cron: refresh cached Stuller wholesale costs for the reorderable stone-SKU catalog.
 * Authorized by the Vercel cron header or ?secret=CRON_SECRET (mirrors update-material-prices).
 */
import { refreshAllStonePrices } from '@/app/api/products/stones/refresh.service';
import { cronAuthorized } from '@/lib/cronAuth';
import { priceJobDue, markPriceJobRun } from '@/services/cron/priceSchedules';

function isAuthorizedCronRequest(req) {
  // Secret in the Authorization header (Vercel scheduler) or ?secret= (manual).
  return cronAuthorized(req);
}

export async function GET(req) {
  if (!isAuthorizedCronRequest(req)) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }
  try {
    // Owner-controlled schedule (settings -> Price Update Schedules).
    const { due, schedule } = await priceJobDue('stonePrices');
    if (!due && !req.nextUrl.searchParams.get('force')) {
      return Response.json({ success: true, skipped: true, reason: 'not due', schedule });
    }

    const summary = await refreshAllStonePrices();
    await markPriceJobRun('stonePrices', { status: 'ok', detail: JSON.stringify(summary).slice(0, 300) });
    return Response.json({ success: true, ...summary }, { status: 200 });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Refresh failed.' }, { status: 500 });
  }
}
