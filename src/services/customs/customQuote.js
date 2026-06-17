/**
 * Custom-order quote math (C4) — single COG-bucket model.
 *
 * Per the locked customs-workflow decisions: fold EVERY cost into one COG
 * bucket — materials (incl. gemstones), bench labor, casting, shipping, the
 * designer CAD fee, the GLB-creation fee, and the QC review fee — then mark the
 * whole bucket up by `cogMarkup` from admin settings (no separate designFee
 * markup). Rush multiplies the marked-up total.
 *
 *   cog        = materials + labor + casting + shipping + designFee + glbFee + qcReviewFee
 *   quoteTotal = cog × cogMarkup × rushMultiplier
 *
 * Artists are paid their base fees as payouts; the marked-up amount is the
 * customer price. Pure functions (settings passed in) so they stay unit-testable
 * without a DB. See docs/manufacturing/customs-workflow.md §2.
 */
const DEFAULT_COG_MARKUP = 2.5;

function round(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function lineCost(item) {
  if (item && item.cost != null) return Number(item.cost) || 0;
  return (Number(item?.quantity) || 1) * (Number(item?.unitPrice) || 0);
}

/**
 * Compute the quote breakdown + total. `settings` supplies the markup
 * (`cogMarkup`, default 2.5) — pass it from admin settings; defaults keep the
 * function usable standalone.
 */
export function computeQuote(quote = {}, settings = {}) {
  const materialsTotal = (quote.materialCosts || []).reduce((sum, m) => sum + lineCost(m), 0);
  const laborTotal = Number(quote.laborCost) || 0;
  const castingTotal = Number(quote.castingCost) || 0;
  const shippingTotal = Number(quote.shippingCost) || 0;
  const designTotal = Number(quote.designFee) || 0;
  const glbTotal = Number(quote.glbFee) || 0;
  const qcTotal = Number(quote.qcReviewFee) || 0;

  // Single COG bucket — everything the shop pays out.
  const cog = materialsTotal + laborTotal + castingTotal + shippingTotal + designTotal + glbTotal + qcTotal;

  const cogMarkup = Number(settings.cogMarkup ?? quote.cogMarkup) > 0
    ? Number(settings.cogMarkup ?? quote.cogMarkup)
    : DEFAULT_COG_MARKUP;
  // Rush is an applied multiplier on the quote (1 = none).
  const rushMultiplier = Number(quote.rushMultiplier) > 1 ? Number(quote.rushMultiplier) : 1;

  const quoteTotal = cog * cogMarkup * rushMultiplier;

  return {
    materialsTotal: round(materialsTotal),
    laborTotal: round(laborTotal),
    castingTotal: round(castingTotal),
    shippingTotal: round(shippingTotal),
    designTotal: round(designTotal),
    glbTotal: round(glbTotal),
    qcTotal: round(qcTotal),
    cog: round(cog),
    cogMarkup,
    rushMultiplier,
    quoteTotal: round(quoteTotal),
    // Projected margin vs the quoted COG (real margin uses piece COGS, see computeMargin).
    projectedMargin: round(quoteTotal - cog),
  };
}

/** Margin = quoteTotal − Σ piece COGS (the real cost incl. bench labor). */
export function computeMargin(quoteTotal, pieceCOGSList = []) {
  const cogs = (pieceCOGSList || []).reduce((sum, c) => sum + (Number(c) || 0), 0);
  const total = Number(quoteTotal) || 0;
  const margin = total - cogs;
  const marginPct = total > 0 ? Math.round((margin / total) * 1000) / 10 : 0;
  return { quoteTotal: round(total), cogs: round(cogs), margin: round(margin), marginPct };
}
