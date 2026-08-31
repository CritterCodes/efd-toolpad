/**
 * Cron: refresh cached Stuller wholesale costs for the reorderable stone-SKU catalog.
 * Authorized by the Vercel cron header or ?secret=CRON_SECRET (mirrors update-material-prices).
 */
import { refreshAllStonePrices } from '@/app/api/products/stones/refresh.service';
import { cronAuthorized } from '@/lib/cronAuth';

function isAuthorizedCronRequest(req) {
  // Secret in the Authorization header (Vercel scheduler) or ?secret= (manual).
  return cronAuthorized(req);
}

export async function GET(req) {
  if (!isAuthorizedCronRequest(req)) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }
  try {
    const summary = await refreshAllStonePrices();
    return Response.json({ success: true, ...summary }, { status: 200 });
  } catch (error) {
    return Response.json({ success: false, error: error.message || 'Refresh failed.' }, { status: 500 });
  }
}
