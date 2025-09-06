/**
 * Material Pricing Utilities - Clean Structure
 * 
 * Utilities for working with the improved material pricing structure
 */

/**
 * Calculate portion-based pricing from Stuller products
 * @param {Object} stullerProduct - Stuller product with pricing info
 * @param {number} portionsPerUnit - Number of portions per unit
 * @returns {Object} - Clean pricing structure
 */
export const calculateCleanPricing = (stullerProduct, portionsPerUnit = 1) => {
  const stullerPrice = parseFloat(stullerProduct.stullerPrice) || 0;
  const markupRate = parseFloat(stullerProduct.markupRate) || 1;
  
  // Calculate unit-level pricing
  const markedUpPrice = stullerPrice * markupRate;
  
  // Calculate portion-level pricing (most important for processes)
  const costPerPortion = stullerPrice / portionsPerUnit;
  const pricePerPortion = markedUpPrice / portionsPerUnit;
  
  return {
    // Unit level (what Stuller sells as a complete unit)
    stullerPrice,           // What we pay Stuller per unit
    markupRate,            // Our markup multiplier
    markedUpPrice,         // What we charge per unit
    
    // Portion level (what processes actually use)  
    costPerPortion,        // What we pay per portion (critical for cost calculation)
    pricePerPortion,       // What we charge per portion (critical for pricing)
    
    // Meta
    portionsPerUnit,
    calculatedAt: new Date().toISOString()
  };
};

/**
 * Update Stuller product with clean pricing structure
 * @param {Object} stullerProduct - Original Stuller product
 * @param {number} portionsPerUnit - Number of portions per unit
 * @returns {Object} - Updated Stuller product with clean pricing
 */
export const updateStullerProductPricing = (stullerProduct, portionsPerUnit = 1) => {
  const cleanPricing = calculateCleanPricing(stullerProduct, portionsPerUnit);
  
  return {
    ...stullerProduct,
    
    // Keep essential pricing properties
    stullerPrice: cleanPricing.stullerPrice,
    markupRate: cleanPricing.markupRate,
    markedUpPrice: cleanPricing.markedUpPrice,
    
    // Add critical portion pricing
    costPerPortion: cleanPricing.costPerPortion,
    pricePerPortion: cleanPricing.pricePerPortion,
    
    // Remove redundant/misleading properties
    unitCost: undefined,  // This was misleading (was actually marked up price)
    
    lastUpdated: new Date().toISOString()
  };
};

/**
 * Get cost per portion for a specific metal/karat combination
 * @param {Object} material - Material object with stullerProducts
 * @param {string} metalType - Metal type to find
 * @param {string} karat - Karat to find  
 * @returns {number} - Cost per portion for this combination
 */
export const getCostPerPortion = (material, metalType, karat) => {
  if (!material.stullerProducts || material.stullerProducts.length === 0) {
    return material.unitCost / (material.portionsPerUnit || 1);
  }
  
  const matchingProduct = material.stullerProducts.find(p => 
    p.metalType === metalType && p.karat === karat
  );
  
  if (matchingProduct) {
    // Use new clean structure if available
    if (matchingProduct.costPerPortion !== undefined) {
      return matchingProduct.costPerPortion;
    }
    
    // Fall back to calculation from stullerPrice
    const stullerPrice = parseFloat(matchingProduct.stullerPrice) || 0;
    return stullerPrice / (material.portionsPerUnit || 1);
  }
  
  return 0;
};

/**
 * Get price per portion for a specific metal/karat combination
 * @param {Object} material - Material object with stullerProducts
 * @param {string} metalType - Metal type to find
 * @param {string} karat - Karat to find
 * @returns {number} - Price per portion for this combination
 */
export const getPricePerPortion = (material, metalType, karat) => {
  if (!material.stullerProducts || material.stullerProducts.length === 0) {
    const unitPrice = material.unitCost || 0;
    return unitPrice / (material.portionsPerUnit || 1);
  }
  
  const matchingProduct = material.stullerProducts.find(p => 
    p.metalType === metalType && p.karat === karat
  );
  
  if (matchingProduct) {
    // Use new clean structure if available
    if (matchingProduct.pricePerPortion !== undefined) {
      return matchingProduct.pricePerPortion;
    }
    
    // Fall back to calculation from marked up price
    const stullerPrice = parseFloat(matchingProduct.stullerPrice) || 0;
    const markupRate = parseFloat(matchingProduct.markupRate) || 1;
    const markedUpPrice = stullerPrice * markupRate;
    return markedUpPrice / (material.portionsPerUnit || 1);
  }
  
  return 0;
};

/**
 * Get price range for multi-variant material (for display)
 * @param {Object} material - Material object
 * @param {boolean} showCost - Show cost prices instead of customer prices
 * @returns {Object} - {min, max, single} pricing info
 */
export const getPriceRange = (material, showCost = false) => {
  if (!material.stullerProducts || material.stullerProducts.length === 0) {
    const unitPrice = material.unitCost || 0;
    const portionPrice = unitPrice / (material.portionsPerUnit || 1);
    return { min: portionPrice, max: portionPrice, single: portionPrice };
  }
  
  const prices = material.stullerProducts.map(product => {
    if (showCost) {
      return getCostPerPortion(material, product.metalType, product.karat);
    } else {
      return getPricePerPortion(material, product.metalType, product.karat);
    }
  }).filter(price => price > 0);
  
  if (prices.length === 0) {
    return { min: 0, max: 0, single: 0 };
  }
  
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  
  return {
    min,
    max,
    single: min === max ? min : null
  };
};

console.log('✅ Material pricing utilities loaded with clean structure support');
