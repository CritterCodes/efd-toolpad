/**
 * Affiliate commission engine (owner rulings, 2026-08-20):
 *
 *   BASE    — pre-tax PROFIT on the piece, not revenue and not after tax. For custom
 *             orders that is the QUOTED profit (quote.quoteTotal − quote.cog): it is
 *             deterministic at the trigger (actual bench costs may still be accruing
 *             when the order gets fully paid), it can't punish the affiliate for shop
 *             cost overruns, and both figures are recorded on the commission for audit.
 *   TRIGGER — the order is PAID IN FULL (paymentProgress.isFullyPaid). Never at
 *             request/quote (requests die), never waiting for delivery (money's in).
 *   RAIL    — the payroll ledger: a flat-fee laborLogs entry (creditedValue, 0 hours),
 *             the same carrier as the client-management bonus, so payouts ride the
 *             machinery that already pays people and show up in payroll batches.
 *   RATE    — the SNAPSHOT taken at attribution time (order.affiliate.commissionRate),
 *             never the live profile rate; changing an affiliate's rate later must not
 *             reprice history.
 *
 * PRODUCT SALES (catalogue, RTS, made-to-order and customized alike) derive profit from
 * the product's recorded `pricing.costBasis` — see `orderProfit`. The storefront strips
 * costBasis from every read, but this engine runs admin-side against the same database,
 * so cost is available here and nowhere the customer can reach. NEEDS_REVIEW is the
 * exception now, not the rule: it means a specific line had no cost recorded, and the
 * commission carries the reason so admin knows what to price rather than guessing.
 *
 * Idempotency is claim-first, like the shop-payment drain: the commissionId is
 * deterministic per source (`comm-<sourceID>`), and the source document's
 * `affiliate.commissionId` is stamped with a null-guarded update BEFORE the commission
 * is written — two triggers racing (invoice mark-paid, the cron) do the work once.
 */
export { COMMISSION_STATUS, COMMISSIONABLE_ORDER_STATUSES } from './commissions/shared';
export { earnCustomOrderCommission, recordProductSaleCommission } from './commissions/earn';
export { approveCommission, voidCommission, notifyNewConversions, drainCommissions } from './commissions/review';
export { listPendingWork, listReviewQueue, listCommissions } from './commissions/queries';
