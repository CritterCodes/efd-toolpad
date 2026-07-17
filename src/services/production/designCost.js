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
 * @param {{ volumeCm3:number, metalKey:string, metalPrices:Record<string,number>, castingMarkup?:number }} args
 *   metalPrices: { gold, silver, platinum, palladium } price-per-gram (24k gold / .999 silver).
 *   castingMarkup: casting-house cost multiplier (default 1.3, configurable via admin settings).
 */
export function estimateMetalCost({ volumeCm3, metalKey, metalPrices = {}, castingMarkup = 1.3 }) {
  const metal = METAL_TYPES[metalKey];
  if (!metal) throw new Error(`Unknown metalKey: ${metalKey}`);

  const volume = Number(volumeCm3) || 0;
  const waxWeightG = volume * WAX_DENSITY_G_PER_CM3;
  const metalWeightG = calculateMetalWeight(waxWeightG, metal.sg);

  const category = getMetalPriceCategory(metalKey);
  const basePricePerGram = Number(metalPrices?.[category]) || 0;
  const pricePerGram = adjustPriceForPurity(basePricePerGram, metalKey);
  // Use configurable casting markup instead of the hardcoded 1.3× in calculateMetalCost.
  const markup = Number(castingMarkup) > 0 ? Number(castingMarkup) : 1.3;
  const metalCost = metalWeightG && pricePerGram ? metalWeightG * pricePerGram * markup : 0;

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
 *           estLaborHours?:number, laborRate?:number,
 *           castingMarkup?:number, castingLaborFee?:number }} args
 *   castingMarkup: passed through to estimateMetalCost (default 1.3).
 *   castingLaborFee: flat per-casting labor charge added to material cost (default 0; admin setting default $15).
 */
export function estimateDesignCost({
  stlVolumeCm3,
  metalKey,
  metalPrices = {},
  bom = {},
  estLaborHours = 0,
  laborRate = 0,
  castingMarkup = 1.3,
  castingLaborFee = 0,
}) {
  const metal = estimateMetalCost({ volumeCm3: stlVolumeCm3, metalKey, metalPrices, castingMarkup });

  const stonesCost = (bom.stones || []).reduce(
    (sum, s) => sum + (Number(s.estUnitCost) || 0) * Math.max(Number(s.qty) || 1, 1),
    0
  );
  const findingsCost = (bom.findings || []).reduce(
    (sum, f) => sum + (Number(f.estUnitCost) || 0) * Math.max(Number(f.qty) || 1, 1),
    0
  );
  const castingEstimate = Number(bom.castingEstimate) || 0;
  const laborCost = (Number(estLaborHours) || 0) * (Number(laborRate) || 0);
  const castingFee = Number(castingLaborFee) || 0;

  const estMaterialCost = round(metal.metalCost + stonesCost + findingsCost + castingEstimate + castingFee);
  const estCost = round(estMaterialCost + laborCost);

  return {
    metal,
    stonesCost: round(stonesCost),
    findingsCost: round(findingsCost),
    castingEstimate: round(castingEstimate),
    castingLaborFee: round(castingFee),
    laborCost: round(laborCost),
    estMaterialCost,
    estCost,
  };
}
