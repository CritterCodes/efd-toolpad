/**
 * Design cost estimator (S3) — the "CAD estimator" brain.
 *
 * Salvages the lost-wax cost model from src/constants/metalTypes.js and the STL
 * volume from src/utils/stlVolumeCalculator.js:
 *   STL volume (cm³) → wax weight → metal weight (× specific gravity) →
 *   karat/purity-adjusted metal price → metal cost (× casting markup) → + stones/findings/labor.
 *
 * Produces a Design's estimated cost (estCost) and material cost (estMaterialCost).
 * Pure functions (no DB) — metal prices are passed in by the caller (from the
 * `metalPrices` collection).
 */
import {
  METAL_TYPES,
  getMetalPriceCategory,
  adjustPriceForPurity,
  calculateMetalWeight,
  calculateMetalCost, // applies the 1.3× casting-house markup
} from '@/constants/metalTypes';

// Lost-wax reference: wax density ≈ 1 g/cm³, so 1 cm³ of model ≈ 1 g of wax.
const WAX_DENSITY_G_PER_CM3 = 1.0;

function round(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * Metal-only cost from model volume.
 * @param {{ volumeCm3:number, metalKey:string, metalPrices:Record<string,number> }} args
 *   metalPrices: { gold, silver, platinum, palladium } price-per-gram (24k gold / .999 silver).
 */
export function estimateMetalCost({ volumeCm3, metalKey, metalPrices = {} }) {
  const metal = METAL_TYPES[metalKey];
  if (!metal) throw new Error(`Unknown metalKey: ${metalKey}`);

  const volume = Number(volumeCm3) || 0;
  const waxWeightG = volume * WAX_DENSITY_G_PER_CM3;
  const metalWeightG = calculateMetalWeight(waxWeightG, metal.sg);

  const category = getMetalPriceCategory(metalKey);
  const basePricePerGram = Number(metalPrices?.[category]) || 0;
  const pricePerGram = adjustPriceForPurity(basePricePerGram, metalKey);
  const metalCost = calculateMetalCost(metalWeightG, pricePerGram);

  return {
    metalKey,
    volumeCm3: round(volume),
    waxWeightG: round(waxWeightG),
    metalWeightG: round(metalWeightG),
    basePricePerGram: round(basePricePerGram),
    pricePerGram: round(pricePerGram),
    metalCost: round(metalCost),
  };
}

/**
 * Full design estimate: metal (from volume) + stones + findings + explicit casting + labor.
 * @param {{ stlVolumeCm3:number, metalKey:string, metalPrices:object,
 *           bom?:{ castingEstimate?:number, stones?:Array, findings?:Array },
 *           estLaborHours?:number, laborRate?:number }} args
 */
export function estimateDesignCost({
  stlVolumeCm3,
  metalKey,
  metalPrices = {},
  bom = {},
  estLaborHours = 0,
  laborRate = 0,
}) {
  const metal = estimateMetalCost({ volumeCm3: stlVolumeCm3, metalKey, metalPrices });

  const stonesCost = (bom.stones || []).reduce(
    (sum, s) => sum + (Number(s.estUnitCost) || 0) * Math.max(Number(s.qty) || 1, 1),
    0
  );
  const findingsCost = (bom.findings || []).reduce(
    (sum, f) => sum + (Number(f.estUnitCost) || 0) * Math.max(Number(f.qty) || 1, 1),
    0
  );
  // Optional explicit casting fee (default 0). The metal cost already includes the
  // 1.3× casting-house markup, so this is only for additional/known casting charges.
  const castingEstimate = Number(bom.castingEstimate) || 0;
  const laborCost = (Number(estLaborHours) || 0) * (Number(laborRate) || 0);

  const estMaterialCost = round(metal.metalCost + stonesCost + findingsCost + castingEstimate);
  const estCost = round(estMaterialCost + laborCost);

  return {
    metal,
    stonesCost: round(stonesCost),
    findingsCost: round(findingsCost),
    castingEstimate: round(castingEstimate),
    laborCost: round(laborCost),
    estMaterialCost,
    estCost,
  };
}

// Default cutting yield: finished carats ÷ rough carats. Minimum ~25% — to deliver a 1ct finished
// stone you buy ~4ct of rough (the cutter's number). Per-variant override allowed.
export const GEM_DEFAULT_YIELD = 0.25;

/**
 * Gemstone-design estimate (cutter's recipe, 2026-07-22): **material + labor, × markup — like
 * jewelry.** The per-carat rate is the ROUGH price (what the cutter pays), not a retail rate;
 * yield converts finished carats to rough carats:
 *
 *   roughCarats = carat ÷ yield        (yield defaults to 0.25 → 1ct finished needs 4ct rough)
 *   material    = roughCarats × roughRatePerCarat
 *   estCost     = material + cutLaborCost (+ extraCost)     // markup is applied by the caller
 *
 * @param {{ carat:number, roughRatePerCarat:number, yield?:number, cutLaborCost?:number, extraCost?:number }} args
 */
export function estimateGemstoneCost({ carat, roughRatePerCarat, yield: yieldRatio = GEM_DEFAULT_YIELD, cutLaborCost = 0, extraCost = 0 }) {
  const ct = Number(carat) || 0;
  const rate = Number(roughRatePerCarat) || 0;
  const y = Number(yieldRatio) > 0 && Number(yieldRatio) <= 1 ? Number(yieldRatio) : GEM_DEFAULT_YIELD;
  const roughCarats = ct / y;
  const materialCost = roughCarats * rate;
  const laborCost = Number(cutLaborCost) || 0;
  const estMaterialCost = round(materialCost + (Number(extraCost) || 0));
  const estCost = round(estMaterialCost + laborCost);
  return {
    carat: ct,
    roughCarats: round(roughCarats),
    roughRatePerCarat: rate,
    yield: y,
    materialCost: round(materialCost),
    laborCost: round(laborCost),
    estMaterialCost,
    estCost,
  };
}

/**
 * STRICT tier resolution for a color bucket's rough $/ct: first tier whose `upToCt` covers the
 * carat; **null beyond the last tier** — that's a special request, never a silent fallback to the
 * cheapest big-stone rate (doc §2).
 */
export function gemTierRate(rates = [], carat) {
  const tiers = (rates || [])
    .map((t) => ({ upToCt: Number(t.upToCt) || 0, ratePerCarat: Number(t.ratePerCarat) || 0 }))
    .filter((t) => t.upToCt > 0 && t.ratePerCarat > 0)
    .sort((a, b) => a.upToCt - b.upToCt);
  if (!tiers.length) return null;
  const c = Number(carat) || 0;
  const tier = tiers.find((t) => c <= t.upToCt);
  return tier ? tier.ratePerCarat : null;
}

/**
 * "From $X" price for a gemstone Design listing — the cheapest configuration a shopper could
 * order: min over purchasable variants × their color buckets, priced at caratMin. Returns null
 * when nothing is priceable (no variants/colors/tiers). Shared costs are omitted (estimate floor).
 */
export function gemstoneFromPrice(design = {}, { defaultMarkup = 2.5 } = {}) {
  const markup = Number(design.pricing?.markup) > 0 ? Number(design.pricing.markup) : defaultMarkup;
  let min = null;
  for (const v of design.variants || []) {
    const g = v.gemstone;
    if (!g || !Array.isArray(g.colors)) continue;
    const ct = Number(g.caratMin) || 0;
    if (!(ct > 0)) continue;
    for (const c of g.colors) {
      const rate = gemTierRate(c.rates, ct);
      if (rate == null) continue;
      const { estCost } = estimateGemstoneCost({ carat: ct, roughRatePerCarat: rate, yield: g.yield, cutLaborCost: g.cutLaborCost });
      const retail = round(estCost * markup);
      if (retail > 0 && (min == null || retail < min)) min = retail;
    }
  }
  return min;
}

/**
 * PUBLIC projection of a gem spec — what the storefront may see. Strips the cutter's pricing
 * internals (rough rate tiers, cut labor, lot qty, rate timestamps); colors become bare labels.
 * Price-at-carat is served by an endpoint (Phase 4), never by shipping the rate table.
 */
export function publicGemstoneSpec(spec = {}) {
  if (!spec || typeof spec !== 'object') return null;
  const { colors, cutLaborCost, lotQty, ratesUpdatedAt, yield: _y, maxPieces, ...pub } = spec; // eslint-disable-line no-unused-vars
  return {
    ...pub,
    ...(Array.isArray(colors) ? { colors: colors.map((c) => c.label).filter(Boolean) } : {}),
  };
}
