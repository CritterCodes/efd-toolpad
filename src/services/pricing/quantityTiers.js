/**
 * Quantity tiers — one price per unit, chosen by how many you are getting (owner, 2026-09-29:
 * "How many are you getting? Are you getting 1 through 4? It's this price per").
 *
 * FLAT, not bracketed: the quantity picks a single tier and every unit is priced at it. A job of six
 * prongs is six at the 5–9 price, not four at full and two discounted.
 *
 * WHAT A TIER MAY MOVE — TWO LEVERS, AND LABOR IS NEITHER OF THEM.
 *
 *   toolPct    the share of MACHINE recovery charged. The Orotig's $10 a use is a sinking fund for a
 *              $500 monthly note sized at roughly fifty welds a month, so charging it on all
 *              eighty-four prongs of one job recovers nearly two months of the note from one
 *              customer. Reducing it corrects an over-recovery; it is not a gift.
 *
 *   marginPct  the share of MARKUP charged. This is what makes tiers work on the rest of the
 *              catalog — setting twenty stones or polishing ten pieces has no machine to compress,
 *              so a volume price there has to come out of profit, deliberately.
 *
 * Labor and materials are never reduced by either lever. Forty-two prongs really is forty-two prongs
 * of bench time, and the gold does not get cheaper by the dozen — so the adjusted cost is the floor a
 * tier can never price below.
 *
 * NOTHING IS HARD-CODED. The ladder lives in Store Settings (`pricing.quantityTiers`) and an empty
 * ladder means no quantity pricing at all — a silent built-in discount would be a rate nobody agreed
 * to. DEFAULT_QUANTITY_TIERS exists to seed the settings form on first use, never as a fallback the
 * pricing path reaches for.
 *
 * Task MINIMUMS are deliberately not applied on top. A minimum price is a single-job floor ("we do
 * not open the shop for less than $40"); enforcing it per unit would cancel the volume price it is
 * unrelated to.
 */

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * The ladder the owner approved, offered as a starting point in Store Settings. Margin is left whole
 * here because these tiers were designed around the welder; a shop wanting volume pricing on
 * labor-only work lowers `marginPct` on the tiers it chooses.
 */
export const DEFAULT_QUANTITY_TIERS = Object.freeze([
  { minQty: 1, toolPct: 100, marginPct: 100 },
  { minQty: 5, toolPct: 70, marginPct: 100 },
  { minQty: 10, toolPct: 50, marginPct: 100 },
  { minQty: 20, toolPct: 30, marginPct: 100 },
]);

/**
 * Pure: a usable ladder from whatever was stored — integers, sorted, deduped by minQty, percentages
 * clamped to 0–100. Anything unparseable is dropped rather than guessed at.
 */
export function normalizeQuantityTiers(input) {
  if (!Array.isArray(input)) return [];
  const pct = (v, fallback) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(Math.max(n, 0), 100) : fallback;
  };
  const byMin = new Map();
  for (const row of input) {
    const minQty = Math.floor(Number(row?.minQty));
    if (!Number.isFinite(minQty) || minQty < 1) continue;
    // A row has to say something about at least one lever to be a row at all.
    if (!Number.isFinite(Number(row?.toolPct)) && !Number.isFinite(Number(row?.marginPct))) continue;
    byMin.set(minQty, { minQty, toolPct: pct(row?.toolPct, 100), marginPct: pct(row?.marginPct, 100) });
  }
  return [...byMin.values()].sort((a, b) => a.minQty - b.minQty);
}

export function tiersFromSettings(settings) {
  return normalizeQuantityTiers(settings?.pricing?.quantityTiers);
}

/** Pure: the tier a quantity falls in — the highest `minQty` it reaches. Null when none applies. */
export function tierForQuantity(tiers, quantity) {
  const qty = Math.max(Math.floor(Number(quantity) || 1), 1);
  let found = null;
  for (const tier of normalizeQuantityTiers(tiers)) {
    if (qty >= tier.minQty) found = tier;
  }
  return found;
}

/** Pure: how a tier reads on a ticket — "20+" or "5–9". */
export function tierLabel(tiers, tier) {
  if (!tier) return '';
  const ladder = normalizeQuantityTiers(tiers);
  const next = ladder.find((t) => t.minQty > tier.minQty);
  return next ? `${tier.minQty}–${next.minQty - 1}` : `${tier.minQty}+`;
}

/**
 * Pure: the unit price for `quantity` of a task, given the live pricing block the engine produced.
 *
 * Reads the task's own effective multiplier out of the price it was given (`price / baseCost`), so
 * one call is correct for retail and for wholesale, and carries any per-metal adjustment with it —
 * no settings, no second code path, no chance of the two drifting.
 *
 *   adjusted cost  = base − tool × (1 − toolPct)          ← labor and materials untouched
 *   adjusted mark  = 1 + (multiplier − 1) × marginPct
 *   unit price     = adjusted cost × adjusted mark
 *
 * Returns the list price unchanged when nothing applies, reported as `applied: false`, so a ticket
 * never claims a break it did not give.
 */
export function applyQuantityTier({ price, pricing = null, quantity = 1, tiers = [] } = {}) {
  const listUnitPrice = round2(price);
  const none = { unitPrice: listUnitPrice, listUnitPrice, applied: false, tier: null, label: '', discountPerUnit: 0 };

  const baseCost = Number(pricing?.baseCost) || 0;
  const toolCost = Math.min(Number(pricing?.toolDepreciationCost) || 0, baseCost);
  if (!(listUnitPrice > 0) || !(baseCost > 0)) return none;

  const tier = tierForQuantity(tiers, quantity);
  if (!tier) return none;
  const cutsTool = tier.toolPct < 100 && toolCost > 0;
  const cutsMargin = tier.marginPct < 100;
  if (!cutsTool && !cutsMargin) return none;

  // Cost first — only the machine share of it can move.
  const adjustedBase = baseCost - toolCost * (1 - tier.toolPct / 100);
  if (!(adjustedBase > 0)) return none;

  // Then the markup this price actually carries. Below cost already (a minimum, an override) means
  // there is no markup to give away, so the margin lever simply has nothing to do.
  const multiplier = listUnitPrice / baseCost;
  const adjustedMultiplier = multiplier > 1
    ? 1 + (multiplier - 1) * (tier.marginPct / 100)
    : multiplier;

  const unitPrice = round2(adjustedBase * adjustedMultiplier);
  if (!(unitPrice > 0) || unitPrice >= listUnitPrice) return none;

  return {
    unitPrice,
    listUnitPrice,
    applied: true,
    tier,
    label: tierLabel(tiers, tier),
    discountPerUnit: round2(listUnitPrice - unitPrice),
  };
}
