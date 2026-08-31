/**
 * Pre-tax PROFIT for a shop order — the commission base for product sales.
 *
 * Custom orders quote their own profit (quoteTotal − cog). A shop order doesn't store
 * cost at all, so profit has to be resolved from the lines. Each line kind knows its
 * cost from a different place, and one of them deliberately doesn't participate:
 *
 *   any product line  productId → products.pricing.costBasis × qty
 *   custom payment    customID  → EXCLUDED (the customs trigger owns those dollars —
 *                                 commissioning them here would pay twice on one payment)
 *
 * MTO AND CUSTOMIZED GO THROUGH THE SAME DOOR. Every purchasable thing on the shop is a
 * product, and `productContract` writes `pricing.costBasis` onto it — the piece's ACTUAL
 * COGS for a made piece (`costBasisSource: 'actual'`), or the design's live-metal
 * estimate for a design-backed one (`'estimated'`). MTO cart lines carry BOTH a productId
 * and designID/variantId, so there is no reason to treat them as unpriceable: the cost is
 * recorded. `costBasisSource` rides along on every line so the resulting commission can
 * always be explained, and so an estimate is never mistaken for a measured cost.
 *
 * The contract: profit is only returned when EVERY commissionable line resolved. One
 * unknown line makes the whole order's profit unknown — a partial number would silently
 * under-pay the affiliate, which is worse than asking a human.
 */
import { db } from '@/lib/database';

const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const n = (v) => Number(v) || 0;

/** A line paid toward a custom order — customs owns its commission, so it sits out. */
function isCustomPaymentLine(line) {
  return line?.type === 'custom-payment' || Boolean(line?.customID);
}

/** MTO / REFRAKT-configured lines also carry a productId — see the note above. */
function isDesignLine(line) {
  return Boolean(line?.designID) && Boolean(line?.variantId);
}

/**
 * Resolve an order's pre-tax profit.
 * @returns {{ ok: true, profit, revenue, cost, lines }}
 *        | {{ ok: false, needsReview: true, reason, revenue }}
 */
export async function resolveOrderProfit(order) {
  const lines = Array.isArray(order?.lines) ? order.lines : [];
  if (!lines.length) {
    return { ok: false, needsReview: true, reason: 'the order has no line items to price', revenue: n(order?.subtotal) };
  }

  const commissionable = lines.filter((l) => !isCustomPaymentLine(l));
  if (!commissionable.length) {
    // Pure custom-payment cart. Not "needs review" — there is genuinely nothing here
    // to commission; the customs paid-in-full trigger handles this money.
    return { ok: false, needsReview: false, reason: 'every line is a custom-order payment', revenue: 0 };
  }

  // A line with no productId can't be priced — every purchasable thing is a product,
  // so this means a malformed line rather than a kind we don't handle.
  const unidentified = commissionable.find((l) => !l.productId);
  if (unidentified) {
    return {
      ok: false,
      needsReview: true,
      reason: `a line ("${unidentified.title || unidentified.designID || 'unknown'}") carries no productId to price from`,
      revenue: n(order?.subtotal),
    };
  }

  const productIds = [...new Set(commissionable.map((l) => l.productId))];
  const dbi = await db.connect();
  const products = await dbi.collection('products')
    .find(
      { productId: { $in: productIds } },
      { projection: { _id: 0, productId: 1, title: 1, 'pricing.costBasis': 1, 'pricing.costBasisSource': 1 } },
    )
    .toArray();
  const costById = new Map(products.map((p) => [p.productId, p.pricing?.costBasis]));
  const sourceById = new Map(products.map((p) => [p.productId, p.pricing?.costBasisSource || null]));

  const resolved = [];
  let cost = 0;
  let revenue = 0;

  for (const line of commissionable) {
    const qty = Math.max(n(line.qty) || 1, 1);
    const unitCost = costById.get(line.productId);
    if (!(n(unitCost) > 0)) {
      // The product has no recorded cost — genuinely unknowable, so a human prices it.
      return {
        ok: false,
        needsReview: true,
        reason: `"${line.title || line.productId}" has no cost basis recorded`,
        revenue: n(order?.subtotal),
      };
    }
    const lineCost = round2(n(unitCost) * qty);
    const lineRevenue = round2(n(line.unitPrice ?? line.priceSnapshot?.subtotal) * qty);
    cost = round2(cost + lineCost);
    revenue = round2(revenue + lineRevenue);
    resolved.push({
      productId: line.productId,
      title: line.title || null,
      qty,
      unitCost: round2(n(unitCost)),
      lineCost,
      lineRevenue,
      // 'actual' = the made piece's real COGS; 'estimated' = the design's live-metal
      // estimate. Recorded so a commission is explainable and an estimate is never
      // silently presented as a measured cost.
      costBasisSource: sourceById.get(line.productId) || null,
      // MTO/configured lines identify their variant too — useful when reconciling a
      // design-level estimate against the specific metal that was actually ordered.
      ...(isDesignLine(line) ? { designID: line.designID, variantId: line.variantId } : {}),
    });
  }

  // Prefer the summed line revenue; fall back to the order subtotal if lines carried no
  // price (older carts). Never use `total` — that is tax-inclusive, and tax is not ours.
  const pretaxRevenue = revenue > 0 ? revenue : n(order?.subtotal);
  return {
    ok: true,
    revenue: pretaxRevenue,
    cost,
    profit: round2(Math.max(0, pretaxRevenue - cost)),
    lines: resolved,
  };
}
