/**
 * A material's cost per portion, for display — THE engine's material cost rule
 * (services/pricing/engine.js materialCost), so the catalog shows exactly what a task is charged for
 * it. This used to run its own lookup, and could mark it up by the deprecated material markup.
 */
import { materialCost, variantKey } from '@/services/pricing/engine';

/** The cost range per portion across a material's stocked metals (or its one cost). */
export const getPriceRange = (material) => {
  const metals = material?.isMetalDependent && Array.isArray(material.stullerProducts)
    ? material.stullerProducts.map(variantKey).filter(Boolean)
    : [null];
  const costs = metals
    .map((metal) => materialCost({ material, metal }))
    .filter((r) => r.ok && r.unitCost > 0)
    .map((r) => r.unitCost);
  if (costs.length === 0) return { min: 0, max: 0, single: 0 };
  const min = Math.min(...costs);
  const max = Math.max(...costs);
  return { min, max, single: min === max ? min : null };
};
