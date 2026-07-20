/**
 * Cron: refresh cached Stuller wholesale costs for the reorderable stone-SKU catalog.
 * Authorized by the Vercel cron header or ?secret=CRON_SECRET (mirrors update-material-prices).
 */
import { refreshAllStonePrices } from '@/app/api/products/stones/refresh.service';

function isAuthorizedCronRequest(req) {
  const querySecret = req.nextUrl.searchParams.get('secret');
  if (querySecret && querySecret === process.env.CRON_SECRET) return true;
  if (req.headers.get('x-vercel-cron')) return true;
  return false;
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
