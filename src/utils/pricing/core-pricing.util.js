import pricingEngine from '@/services/PricingEngine';

/**
 * Get default pricing structure
 */
export function getDefaultPricing() {
  return {
    pricing: {
      totalLaborHours: 0,
      totalLaborCost: 0,
      totalMaterialsCost: 0,
      markedUpMaterialCost: 0,
      baseCost: 0,
      retailPrice: 0,
      wholesalePrice: 0,
      businessMultiplier: 1.5,
      calculatedAt: new Date().toISOString(),
      pricingType: 'universal'
    },
    basePrice: 0,
    laborHours: 0
  };
}

/**
 * Calculate task pricing based on new process and material structures
 * 
 * @deprecated This method is deprecated. Use PricingEngine.calculateTaskCost() instead.
 * This method now calls PricingEngine internally for backward compatibility.
 * 
 * @param {Object} taskData - Task data with processes
 * @param {string} selectedMetal - Selected metal type for pricing (e.g., "Sterling Silver 925")
 * @param {Object} adminSettings - Admin settings with hourly rate and markups
 * @returns {Object} Complete pricing breakdown
 */
export function calculateTaskPricing(taskData, selectedMetal = null, adminSettings = {}) {
  console.warn('⚠️ DEPRECATED: TaskPricingUtil.calculateTaskPricing() - Please migrate to PricingEngine.calculateTaskCost()');
  
  // Use PricingEngine for consistent calculations
  try {
    const pricing = pricingEngine.calculateTaskCost(taskData, adminSettings);
    
    // Transform PricingEngine output to match old format for backward compatibility
    return {
      pricing: {
        totalLaborHours: pricing.totalLaborHours,
        totalLaborCost: pricing.totalProcessCost, // Note: PricingEngine combines process costs
        totalMaterialsCost: pricing.totalMaterialCost,
        markedUpMaterialCost: pricing.markedUpMaterialCost,
        baseCost: pricing.baseCost,
        retailPrice: pricing.retailPrice,
        wholesalePrice: pricing.wholesalePrice,
        businessMultiplier: pricing.businessMultiplier,
        calculatedAt: pricing.calculatedAt,
        pricingType: 'universal'
      },
      basePrice: pricing.retailPrice,
      laborHours: pricing.totalLaborHours
    };
  } catch (error) {
    console.error('🔥 TASK-PRICING - Error calculating pricing:', error);
    return getDefaultPricing();
  }
}

/**
 * Calculate pricing for a specific metal variant
 * @param {Object} taskData - Task data with processes
 * @param {string} metalKey - Specific metal variant (e.g., "Sterling Silver 925")
 * @param {Object} adminSettings - Admin settings
 * @returns {Object} Pricing for the specific metal
 */
export function calculateVariantPricing(taskData, metalKey, adminSettings = {}) {
  const fullPricing = calculateTaskPricing(taskData, metalKey, adminSettings);
  
  if (fullPricing.pricing.pricingType === 'variant' && fullPricing.pricing.variants[metalKey]) {
    return fullPricing.pricing.variants[metalKey];
  }
  
  // Return universal pricing if no variant found
  return {
    laborCost: fullPricing.pricing.totalLaborCost,
    materialsCost: fullPricing.pricing.totalMaterialsCost,
    totalCost: fullPricing.pricing.baseCost,
    retailPrice: fullPricing.pricing.retailPrice,
    wholesalePrice: fullPricing.pricing.wholesalePrice
  };
}