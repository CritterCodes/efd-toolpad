/**
 * Cron: earn affiliate commissions
 * GET /api/cron/earn-commissions?secret=CRON_SECRET   (every 30 min — see vercel.json)
 *
 * The guaranteed consumer behind the event hooks (invoice mark-paid, the shop payment
 * drain). Sweeps attributed sources that don't carry a commission yet: custom orders
 * get the paid-in-full trigger re-checked and earn automatically (base = pre-tax quoted
 * profit × the attribution-snapshotted rate; payout = a payroll laborLogs entry); paid
 * shop orders get a needs-review record for admin to price. Claim-first idempotent —
 * overlap with the hooks is safe. See services/affiliates/commissionEngine.
 */
import { drainCommissions, notifyNewConversions } from '@/services/affiliates/commissionEngine';
import { cronAuthorized } from '@/lib/cronAuth';

export async function GET(req) {
  // Vercel's scheduler sends the secret as an Authorization header;
  // manual runs use ?secret=. Both accepted (lib/cronAuth).
  if (!cronAuthorized(req)) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const result = await drainCommissions({ limit: 50 });
    // Same sweep tells affiliates their link converted — attribution happens in the
    // shop, which can't reach admin's notification layer, so this is the notifier.
    // Non-fatal: earning money matters more than announcing it.
    let conversions = { notified: 0 };
    try {
      conversions = await notifyNewConversions({ limit: 50 });
    } catch (e) {
      console.error('[cron] conversion notifications failed:', e?.message || e);
    }
    return Response.json({ success: true, ...result, conversionsNotified: conversions.notified });
  } catch (e) {
    console.error('[cron] earn-commissions failed:', e?.message || e);
    return Response.json({ success: false, error: e?.message || 'drain failed' }, { status: 500 });
  }
}
