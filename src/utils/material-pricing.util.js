/**
 * Material Pricing Utilities
 *
 * All prices are computed from raw source values (stullerPrice, portionsPerUnit,
 * adminSettings.materialMarkup). Nothing is read from stored calculated fields.
 */

/**
 * Get raw cost per portion for a specific metal/karat combination.
 * Uses stullerPrice (what we pay) / portionsPerUnit.
 */
export const getCostPerPortion = (material, metalType, karat) => {
  const portionsPerUnit = material.portionsPerUnit || 1;

  if (material.stullerProducts && material.stullerProducts.length > 0) {
    const product = material.stullerProducts.find(
      p => p.metalType === metalType && p.karat === karat
    );
    if (product) {
      const stullerPrice = parseFloat(product.stullerPrice) || 0;
      return stullerPrice / portionsPerUnit;
    }
    return 0;
  }

  // Non-metal-dependent material — use top-level stullerPrice or unitCost (raw)
  const rawCost = parseFloat(material.stullerPrice) || parseFloat(material.unitCost) || 0;
  return rawCost / portionsPerUnit;
};

/**
 * Get marked-up price per portion for a specific metal/karat combination.
 * Applies adminSettings.materialMarkup to the raw cost per portion.
 */
export const getPricePerPortion = (material, metalType, karat, adminSettings = {}) => {
  const markup = adminSettings?.pricing?.materialMarkup || adminSettings?.materialMarkup || 1;
  return getCostPerPortion(material, metalType, karat) * markup;
};

/**
 * Get price range across all metal variants of a material (for display).
 * showCost=true returns raw cost range; false returns marked-up price range.
 */
export const getPriceRange = (material, showCost = false, adminSettings = {}) => {
  if (!material.stullerProducts || material.stullerProducts.length === 0) {
    const portionsPerUnit = material.portionsPerUnit || 1;
    const raw = (parseFloat(material.stullerPrice) || parseFloat(material.unitCost) || 0) / portionsPerUnit;
    const markup = adminSettings?.pricing?.materialMarkup || adminSettings?.materialMarkup || 1;
    const price = showCost ? raw : raw * markup;
    return { min: price, max: price, single: price };
  }

  const prices = material.stullerProducts.map(product => {
    return showCost
      ? getCostPerPortion(material, product.metalType, product.karat)
      : getPricePerPortion(material, product.metalType, product.karat, adminSettings);
  }).filter(p => p > 0);

  if (prices.length === 0) return { min: 0, max: 0, single: 0 };

  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max, single: min === max ? min : null };
};
