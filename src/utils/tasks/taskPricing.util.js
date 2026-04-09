import { getTaskSupportedMetals, getTaskSupportedKarats } from './taskContext.util.js';

/**
 * Get task price for specific metal/karat combination
 */
export function getTaskPrice(task, metalType, karat) {
  if (!task.universalPricing || !task.universalPricing[metalType]) {
    return null;
  }

  return task.universalPricing[metalType][karat] || null;
}

/**
 * Calculate task complexity score
 */
export function calculateTaskComplexity(task) {
  let complexity = 0;

  // Base complexity from process count
  complexity += task.processes.length * 10;

  // Complexity from metal support variety
  const supportedMetals = getTaskSupportedMetals(task);
  complexity += supportedMetals.length * 5;

  // Complexity from total karat options
  let totalKarats = 0;
  supportedMetals.forEach(metalType => {
    totalKarats += getTaskSupportedKarats(task, metalType).length;
  });
  complexity += totalKarats * 2;

  // Description complexity
  if (task.description && task.description.length > 100) {
    complexity += 5;
  }

  return complexity;
}

/**
 * Calculate average price across all metal/karat combinations
 */
export function calculateAverageTaskPrice(task) {
  if (!task.universalPricing) return 0;

  let totalPrice = 0;
  let priceCount = 0;

  Object.values(task.universalPricing).forEach(metalPricing => {
    if (typeof metalPricing === 'object') {
      Object.values(metalPricing).forEach(price => {
        if (typeof price === 'number' && !isNaN(price)) {
          totalPrice += price;
          priceCount++;
        }
      });
    }
  });

  return priceCount > 0 ? totalPrice / priceCount : 0;
}

/**
 * Get task price range (min/max across all metals)
 */
export function getTaskPriceRange(task) {
  if (!task.universalPricing) return { min: null, max: null };

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let hasAnyPrice = false;

  Object.values(task.universalPricing).forEach(metalPricing => {
    if (typeof metalPricing === 'object') {
      Object.values(metalPricing).forEach(price => {
        if (typeof price === 'number' && !isNaN(price)) {
          hasAnyPrice = true;
          minPrice = Math.min(minPrice, price);
          maxPrice = Math.max(maxPrice, price);
        }
      });
    }
  });

  if (!hasAnyPrice) {
    return { min: null, max: null };
  }

  return {
    min: minPrice === Infinity ? null : minPrice,
    max: maxPrice === -Infinity ? null : maxPrice
  };
}
