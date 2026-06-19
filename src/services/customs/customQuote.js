/**
 * Custom-order quote math (C4 + structured-parity) — single COG-bucket model over
 * the legacy custom-ticket quote SHAPE (centerstone / mounting / accent stones /
 * additional materials / labor tasks / shipping lines + casting + designer/GLB/QC
 * fees). Everything folds into ONE COG bucket, then × cogMarkup (admin settings)
 * × rush. Artists are paid base fees; the marked-up amount is the customer price.
 *
 *   cog        = materials + labor + shipping + casting + designer + GLB + QC fees
 *   quoteTotal = cog × cogMarkup × (isRush ? rushMultiplier : 1)
 *
 * Legacy flat fields (materialCosts[]/laborCost/shippingCost) are still summed so
 * pre-existing orders keep computing. Pure (settings passed in) — unit-testable.
 */
const DEFAULT_COG_MARKUP = 2.5;
const DEFAULT_RUSH = 1.5;

function round(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}
const n = (v) => Number(v) || 0;
/** cost × quantity for line-item arrays (qty defaults to 1). */
function lineSum(arr) {
  return (arr || []).reduce((s, x) => s + n(x.cost) * Math.max(n(x.quantity) || 1, 1), 0);
}
/** Legacy generic material line: explicit cost, else qty × unitPrice. */
function legacyLine(m) {
  if (m.cost != null && m.cost !== '') return n(m.cost);
  return Math.max(n(m.quantity) || 1, 0) * n(m.unitPrice);
}

export function computeQuote(quote = {}, settings = {}) {
  const materialsTotal =
    n(quote.centerstone?.cost) + n(quote.mounting?.cost)
    + lineSum(quote.accentStones) + lineSum(quote.additionalMaterials)
    + (quote.materialCosts || []).reduce((s, m) => s + legacyLine(m), 0); // legacy fallback
  const laborTotal = lineSum(quote.laborTasks) + n(quote.laborCost);       // + legacy flat
  const shippingTotal = lineSum(quote.shippingCosts) + n(quote.shippingCost);
  const castingTotal = n(quote.castingCost);
  const designTotal = n(quote.designFee);
  const glbTotal = n(quote.glbFee);
  const qcTotal = n(quote.qcReviewFee);

  const cog = materialsTotal + laborTotal + shippingTotal + castingTotal + designTotal + glbTotal + qcTotal;

  const cogMarkup = n(settings.cogMarkup) > 0 ? n(settings.cogMarkup) : (n(quote.cogMarkup) > 0 ? n(quote.cogMarkup) : DEFAULT_COG_MARKUP);
  let rushMultiplier = 1;
  if (quote.isRush) rushMultiplier = n(quote.rushMultiplier) > 1 ? n(quote.rushMultiplier) : (n(settings.rushMultiplier) > 1 ? n(settings.rushMultiplier) : DEFAULT_RUSH);
  else if (n(quote.rushMultiplier) > 1) rushMultiplier = n(quote.rushMultiplier); // legacy flat rush

  const quoteTotal = cog * cogMarkup * rushMultiplier;

  return {
    materialsTotal: round(materialsTotal),
    laborTotal: round(laborTotal),
    shippingTotal: round(shippingTotal),
    castingTotal: round(castingTotal),
    designTotal: round(designTotal),
    glbTotal: round(glbTotal),
    qcTotal: round(qcTotal),
    cog: round(cog),
    cogMarkup,
    rushMultiplier,
    quoteTotal: round(quoteTotal),
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
