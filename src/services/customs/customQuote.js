/**
 * Custom-order quote math (S7b) — preserves the legacy custom-ticket formula so new
 * customs price identically: subtotal = materials + labor×rush + casting + shipping +
 * design; quoteTotal = subtotal × (1 + markup) with markup defaulting to 40%.
 *
 * Plus margin vs the linked pieces' real COGS (incl. bench labor) — the thing legacy
 * never surfaced. Pure functions; unit-tested.
 */
function round(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function lineCost(item) {
  if (item && item.cost != null) return Number(item.cost) || 0;
  return (Number(item?.quantity) || 1) * (Number(item?.unitPrice) || 0);
}

/** Compute the quote breakdown + total from quote inputs. */
export function computeQuote(quote = {}) {
  const materialsTotal = (quote.materialCosts || []).reduce((sum, m) => sum + lineCost(m), 0);
  const rush = Number(quote.rushMultiplier) || 1;
  const laborTotal = (Number(quote.laborCost) || 0) * rush;
  const castingTotal = Number(quote.castingCost) || 0;
  const shippingTotal = Number(quote.shippingCost) || 0;
  const designTotal = Number(quote.designFee) || 0;

  const subtotal = materialsTotal + laborTotal + castingTotal + shippingTotal + designTotal;
  const markupRate = quote.markup != null ? Number(quote.markup) : 0.40;
  const markupAmount = subtotal * markupRate;
  const quoteTotal = subtotal + markupAmount;

  return {
    materialsTotal: round(materialsTotal),
    laborTotal: round(laborTotal),
    castingTotal: round(castingTotal),
    shippingTotal: round(shippingTotal),
    designTotal: round(designTotal),
    subtotal: round(subtotal),
    markupRate,
    markupAmount: round(markupAmount),
    quoteTotal: round(quoteTotal),
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
