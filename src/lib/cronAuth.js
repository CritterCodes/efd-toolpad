/**
 * Cron invocation auth — accepts BOTH ways the secret arrives:
 *
 *   Authorization: Bearer <CRON_SECRET>   ← how Vercel's scheduler actually calls
 *   ?secret=<CRON_SECRET>                 ← manual runs / external schedulers
 *
 * This exists because every route checked ONLY the query param, and Vercel sends
 * only the header — so every scheduled cron 403'd silently (caught in the runtime
 * logs: drain-shop-payments, earn-commissions, abandoned-cart, all rejected).
 * The commission sweep and the daily repricer had never fired on schedule.
 */
export function cronAuthorized(req) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return false; // no secret configured = nothing is authorized

  const auth = req.headers?.get?.('authorization') || '';
  if (auth === `Bearer ${expected}`) return true;

  const query = req.nextUrl?.searchParams?.get?.('secret');
  return query === expected;
}
