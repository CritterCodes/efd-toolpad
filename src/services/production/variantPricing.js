/**
 * The variant cost/retail recipe — ONE source of truth for the design editor and the
 * daily repricer.
 *
 * This math used to live only inside the Pricing tab's React component, which meant the
 * only place a design's price could be computed was a browser with that page open. That
 * is why listings held whatever number was typed on the day they were authored while
 * metal moved underneath them. Pulling the pure functions out lets the nightly job
 * compute exactly what the editor shows — parity is the whole point, so if you change a
 * formula here, both surfaces move together and neither drifts.
 *
 * THE RECIPE (jewelry):
 *   mounting  = metal × 1.3 + $15 print/sprue      (designCost.estimateMetalCost)
 *   stones    = Σ unit × qty                        (SKU rows read the LIVE catalog cost)
 *   autoLabor = casting cleanup + stone setting     (only until materialised as shared rows)
 *   shared    = labor tasks + shipping + design fee (per piece)
 *   cog       = mounting + stones + autoLabor + shared
 *   retail    = cog × markup                        (variant override wins over design)
 *
 * Gem designs price per carat at order time (the listing carries a "from" floor), so they
 * are NOT priced here — see designCost.gemstoneFromPrice.
 */

const round = (v) => Math.round((Number(v) || 0) * 100) / 100;

/** Stone-setting labor by carat band × count. Gem type is irrelevant to setting time. */
export const SETTING_BANDS = [
  { key: '1plus', min: 1, label: 'Set Stone 1ct or larger', fallback: 40 },
  { key: 'mid', min: 0.5, label: 'Set Stone 0.5ct to 0.99ct', fallback: 20 },
  { key: 'small', min: 0.0001, label: 'Set Stone less than 0.49ct', fallback: 10 },
];

export const caratBand = (ct) => {
  const c = Number(ct) || 0;
  return SETTING_BANDS.find((b) => c >= b.min) || null;
};

/**
 * A stone row's unit cost. A SKU-linked row reads the CURRENT catalog wholesale (kept
 * fresh by the stone cron) so stones stay live like metal; a manual row uses its own.
 */
export const stoneUnit = (r, stoneCosts = {}) => (
  r?.stoneSkuId && stoneCosts[r.stoneSkuId] != null
    ? Number(stoneCosts[r.stoneSkuId])
    : Number(r?.unitCost) || 0
);

/** Per-variant stone cost = Σ(unit × qty). */
export const sumStones = (arr, stoneCosts = {}) => (arr || [])
  .reduce((s, r) => s + stoneUnit(r, stoneCosts) * (Number(r.qty) || 1), 0);

/** Shared-cost rows (labor tasks / shipping) use `quantity`. */
export const sumLines = (arr) => (arr || [])
  .reduce((s, r) => s + (Number(r.cost) || 0) * (Number(r.quantity) || 1), 0);

/** Auto-labor lines use `qty`. */
export const sumLaborLines = (lines) => (lines || [])
  .reduce((s, l) => s + (Number(l.cost) || 0) * (Number(l.qty) || 1), 0);

/**
 * Per-piece labor inferred from the CAD: casting defaults by production method + stone
 * setting tallied by carat band. `taskCosts` (the live task catalog) overrides fallbacks.
 */
export function autoLaborLines(variant, productionMethod, taskCosts = {}) {
  const lines = [];
  if (productionMethod === 'cad_cast') {
    lines.push({ key: 'cleanup', label: 'Clean up Casting', qty: 1, cost: taskCosts['Clean up Casting'] ?? 40, auto: 'casting' });
  }
  const tally = new Map();
  for (const g of (variant?.gemstones || [])) {
    const band = caratBand(g.caratEach);
    if (!band) continue;
    const cur = tally.get(band.key) || { key: band.key, label: band.label, qty: 0, cost: taskCosts[band.label] ?? band.fallback, auto: 'setting' };
    cur.qty += Number(g.qty) || 1;
    tally.set(band.key, cur);
  }
  for (const l of tally.values()) lines.push(l);
  return lines;
}

/**
 * Turn auto-derived labor into real, editable SHARED labor-task rows. PURE.
 *
 * A design has ONE CAD file, so its stone count is a property of the DESIGN — every variant
 * is the same geometry in a different metal. Auto labor is therefore identical across
 * variants and genuinely shared, which is why it belongs in the Shared costs panel rather
 * than being recomputed per card. (Owner, 2026-07-31: "all variants have the same stone
 * count… that would make it a different design.")
 *
 * Shape matches LaborTaskEditor: `quantity` (not qty) and string fields, and `sumLines`
 * multiplies cost × quantity — so the seeded rows total exactly what `autoLaborLines`
 * totalled. That equality is what makes seeding price-neutral.
 */
export function autoLaborAsSharedRows(variant, productionMethod, taskCosts = {}) {
  return autoLaborLines(variant || {}, productionMethod, taskCosts).map((l) => ({
    description: l.label,
    quantity: String(l.qty || 1),
    hours: '',
    // Casting cleanup is bench work; stone setting is bench work too — both default to the bench lane.
    discipline: 'bench_jewelry',
    cost: String(l.cost ?? ''),
    autoSeeded: true,   // provenance, so it's clear these came from the CAD rather than being typed
  }));
}

/**
 * The per-piece design fee that cascades into shared costs. `split` divides the fee
 * across a limited edition's run; unlimited editions can only be flat or waived.
 */
export function effectiveDesignFee(fee, artisanFee, editionType, editionLimit) {
  const mode = fee?.mode || 'flat';
  if (mode === 'waived') return 0;
  const base = fee?.amount != null && fee.amount !== '' ? Number(fee.amount) : (Number(artisanFee) || 0);
  if (mode === 'split' && editionType === 'limited') {
    const n = Number(editionLimit) || 1;
    return n > 0 ? base / n : base;
  }
  return base;
}

/** Costs shared by every variant of a design: labor tasks + shipping + the design fee. */
export function sharedCostsFor(pricing = {}, { artisanFee = 0, editionType = null, editionLimit = null } = {}) {
  return sumLines(pricing.laborTasks)
    + sumLines(pricing.shipping)
    + effectiveDesignFee(pricing.designFee, artisanFee, editionType, editionLimit);
}

/** Auto labor counts ONLY until it has been materialised into editable shared rows. */
export const hasSharedLabor = (pricing = {}) => (pricing.laborTasks || []).length > 0;

/**
 * Cost + retail for one variant.
 *
 * `mounting` is passed in (the caller resolves metal cost per metalKey, so a design's
 * metals are priced once rather than once per variant). Returns the workings, not just a
 * number, so a repricing run can explain every figure it wrote.
 */
export function variantPricing({
  variant = {},
  mounting = 0,
  sharedCosts = 0,
  sharedLabor = false,
  baseMarkup = 2.5,
  productionMethod = null,
  taskCosts = {},
  stoneCosts = {},
}) {
  const stones = sumStones(variant.gemstones, stoneCosts);
  const autoLines = autoLaborLines(variant, productionMethod, taskCosts);
  const autoLabor = sharedLabor ? 0 : sumLaborLines(autoLines);
  const markup = Number(variant.markupOverride) > 0 ? Number(variant.markupOverride) : Number(baseMarkup) || 2.5;
  const cog = Number(mounting) + stones + autoLabor + Number(sharedCosts);
  return {
    mounting: round(mounting),
    stones: round(stones),
    autoLabor: round(autoLabor),
    sharedCosts: round(sharedCosts),
    markup,
    cog: round(cog),
    retail: round(cog * markup),
  };
}
