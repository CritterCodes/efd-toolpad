/**
 * Affiliate-facing explanation of a NEEDS_REVIEW commission (owner, 2026-09-22: affiliates could see
 * "processing" and nothing else). The engine records `basis.reviewReason` for admins
 * (services/affiliates/orderProfit.js writes the sentences); this turns it into what the affiliate
 * should know: what is waiting, on whom, and what happens next. Pure.
 */

const QUOTED = /"([^"]+)"/;

/** Pure: { title, detail, nextStep, product } for a commission; null when it is not waiting on review. */
export function affiliateReviewExplanation(commission = {}) {
  if (commission?.status !== 'needs_review') return null;
  const reason = String(commission?.basis?.reviewReason || commission?.reviewReason || '').trim();
  const product = (reason.match(QUOTED) || [])[1] || '';

  let title = 'Waiting on the shop to price this order';
  let detail = 'The shop has to confirm the order’s cost before your commission can be calculated.';
  if (/no cost basis/i.test(reason)) {
    title = product ? `Waiting on the shop to enter a cost for “${product}”` : 'Waiting on the shop to enter a product cost';
    detail = 'Your commission is a share of pre-tax PROFIT, and this product was sold before its cost was recorded. Once the shop enters it, the profit and your commission are computed from that.';
  } else if (/no productId/i.test(reason)) {
    title = product ? `Waiting on the shop to identify “${product}”` : 'Waiting on the shop to identify a line on this order';
    detail = 'One line on the order could not be matched to a catalog product, so its cost is unknown. The shop matches it and the commission is computed.';
  } else if (/no line items/i.test(reason)) {
    title = 'Waiting on the shop to review an order with no priced lines';
    detail = 'The order was paid but carried nothing the system could price. The shop reviews it by hand.';
  }
  return {
    title,
    detail,
    product,
    nextStep: 'Nothing to do on your side. When the shop enters the number, this row flips to “earned” and joins your next weekly payout.',
    reason,
  };
}

/** Pure: attach `review` to each commission in a list (null when not applicable). */
export function withReviewExplanations(commissions = []) {
  return (commissions || []).map((c) => ({ ...c, review: affiliateReviewExplanation(c) }));
}
