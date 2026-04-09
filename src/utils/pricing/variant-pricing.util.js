/**
 * Build variant pricing structure for multi-metal tasks
 */
export function buildVariantPricing(metalVariantPricing, businessMultiplier, hourlyRate) {
  const variants = {};
  const retailPrices = {};

  Object.keys(metalVariantPricing).forEach(metalKey => {
    const variant = metalVariantPricing[metalKey];
    const retailPrice = variant.totalCost * businessMultiplier;

    variants[metalKey] = {
      laborCost: variant.laborCost,
      materialsCost: variant.materialsCost,
      totalCost: variant.totalCost,
      retailPrice
    };

    retailPrices[metalKey] = retailPrice;
  });

  // Use the first variant for base pricing
  const firstVariant = Object.values(variants)[0];
  
  return {
    pricing: {
      totalLaborHours: firstVariant.laborCost / hourlyRate,
      totalLaborCost: firstVariant.laborCost,
      totalMaterialsCost: firstVariant.materialsCost,
      markedUpMaterialCost: firstVariant.materialsCost * 2, // Assuming 2x markup
      baseCost: firstVariant.totalCost,
      retailPrice: firstVariant.retailPrice,
      businessMultiplier,
      calculatedAt: new Date().toISOString(),
      pricingType: 'variant',
      variants,
      retailPrices
    },
    basePrice: firstVariant.retailPrice,
    laborHours: firstVariant.laborCost / hourlyRate
  };
}

/**
 * Get available metal variants from task processes
 * @param {Object} taskData - Task data with processes
 * @returns {Array} Array of available metal variants
 */
export function getAvailableMetalVariants(taskData) {
  if (!taskData.processes || taskData.processes.length === 0) {
    return [];
  }

  const metalVariants = new Set();

  taskData.processes.forEach(processSelection => {
    const process = processSelection.process;
    if (process && process.pricing && process.pricing.totalCost && typeof process.pricing.totalCost === 'object') {
      Object.keys(process.pricing.totalCost).forEach(metalKey => {
        metalVariants.add(metalKey);
      });
    }
  });

  return Array.from(metalVariants).sort();
}