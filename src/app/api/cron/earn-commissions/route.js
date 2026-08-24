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
import { drainCommissions } from '@/services/affiliates/commissionEngine';

export async function GET(req) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return Response.json({ success: false, error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const result = await drainCommissions({ limit: 50 });
    return Response.json({ success: true, ...result });
  } catch (e) {
    console.error('[cron] earn-commissions failed:', e?.message || e);
    return Response.json({ success: false, error: e?.message || 'drain failed' }, { status: 500 });
  }
}
