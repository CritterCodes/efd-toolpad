/**
 * Cron: drain the shop's custom-payment queue
 * GET /api/cron/drain-shop-payments?secret=CRON_SECRET   (every 10 min — see vercel.json)
 *
 * The shop webhook writes paid `customInvoices` records for checkout payments toward
 * custom orders and queues `customPaymentCredits` for admin's machinery: threshold
 * status advancement (deposit → in_production at 50%), the receipt email, and the
 * client notification. This cron is the guaranteed consumer; opening the order in
 * admin also drains its credits opportunistically, so this mostly mops up.
 * Idempotent — each credit is claimed first-wins. See services/customs/shopPaymentCredits.
 */
import { drainShopPaymentCredits } from '@/services/customs/shopPaymentCredits';
import { cronAuthorized } from '@/lib/cronAuth';

export async function GET(req) {
  // Vercel's scheduler sends the secret as an Authorization header;
  // manual runs use ?secret=. Both accepted (lib/cronAuth).
  if (!cronAuthorized(req)) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const result = await drainShopPaymentCredits({ limit: 50 });
    return Response.json({ success: true, ...result });
  } catch (e) {
    console.error('[cron] drain-shop-payments failed:', e?.message || e);
    return Response.json({ success: false, error: e?.message || 'drain failed' }, { status: 500 });
  }
}
