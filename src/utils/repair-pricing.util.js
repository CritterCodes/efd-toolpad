/**
 * Repair Pricing Utilities
 * 
 * Utilities for calculating pricing in repairs based on metal type and karat,
 * with support for both universal and legacy pricing structures.
 */

/**
 * Generates a metal key for pricing lookups
 * @param {string} metalType - The metal type (e.g., 'yellow-gold', 'white-gold', 'sterling-silver')
 * @param {string} karat - The karat value (e.g., '10k', '14k', '18k', '925')
 * @returns {string|null} - The generated metal key or null if invalid
 */
export function generateMetalKey(metalType, karat) {
  if (!metalType || !karat) {
    return null;
  }

  // Normalize inputs
  const normalizedKarat = karat.toUpperCase().replace(/[^0-9K]/g, '');
  
  // Metal type mapping - updated to handle both formats
  const metalTypeMap = {
    'yellow-gold': 'Yellow Gold',
    'white-gold': 'White Gold', 
    'rose-gold': 'Rose Gold',
    'sterling-silver': 'Sterling Silver',
    'silver': 'Sterling Silver',
    'platinum': 'Platinum',
    'palladium': 'Palladium'
  };

  const mappedMetalType = metalTypeMap[metalType.toLowerCase()] || metalType;
  
  let metalKey;
  
  // Handle sterling silver special case
  if (metalType.toLowerCase().includes('silver')) {
    metalKey = `${mappedMetalType} ${normalizedKarat}`;
  } else {
    // Handle gold and other metals
    metalKey = `${mappedMetalType} ${normalizedKarat}`;
  }

  return metalKey;
}

/**
 * Generates an underscore-formatted metal key for task pricing lookups
 * @param {string} metalType - The metal type (e.g., 'yellow-gold', 'white-gold', 'sterling-silver')
 * @param {string} karat - The karat value (e.g., '10k', '14k', '18k', '925')
 * @returns {string|null} - The generated underscore metal key or null if invalid
 */
  // Generate underscore-separated metal key (for universalPricing)
  const generateUnderscoreMetalKey = (metal, karat) => {
    if (!metal) return null;
    
    // Replace both spaces and hyphens with underscores, then convert to lowercase
    let metalPart = metal.toLowerCase().replace(/[\s-]+/g, '_');
    
    if (karat && karat !== 'N/A') {
      // Convert karat to uppercase K format to match database keys (10k -> 10K)
      const karatPart = karat.replace(/\s+/g, '_').toUpperCase();
      return `${metalPart}_${karatPart}`;
    }
    
    return metalPart;
  };

/**
 * Apply business multiplier to a base price based on admin settings
 * @param {number} basePrice - The base price to apply multiplier to
 * @param {Object} adminSettings - Admin settings containing fee structure
 * @returns {number} The price with business multiplier applied
 * @throws {Error} When admin settings are missing or invalid
 */
function applyBusinessMultiplier(basePrice, adminSettings) {
  if (!basePrice || basePrice === 0) {
    return 0;
  }
  
  if (!adminSettings?.pricing) {
    throw new Error('Admin settings pricing configuration is missing. Cannot calculate business multiplier.');
  }
  
  const { administrativeFee, businessFee, consumablesFee } = adminSettings.pricing;
  
  if (administrativeFee === undefined || businessFee === undefined || consumablesFee === undefined) {
    throw new Error('Admin settings pricing fees are incomplete. Missing: ' + 
      [
        administrativeFee === undefined ? 'administrativeFee' : null,
        businessFee === undefined ? 'businessFee' : null,
        consumablesFee === undefined ? 'consumablesFee' : null
      ].filter(Boolean).join(', '));
  }
  
  const businessMultiplier = (administrativeFee + businessFee + consumablesFee) + 1;
  
  return basePrice * businessMultiplier;
}

/**
 * Get metal-specific price from universal pricing structure
 * @param {Object} item - Task, process, or material with pricing data
 * @param {string} metalType - The metal type
 * @param {string} karat - The karat
 * @param {boolean} isWholesale - Whether to get wholesale price
 * @param {Object} adminSettings - Admin settings for applying business multipliers
 * @returns {number} The appropriate price
 */
export const getMetalSpecificPrice = (item, repairMetalType, karat = null, isWholesale = false, adminSettings = null) => {
  // Check for universal pricing first
  if (item?.price && typeof item.price === 'number') {
    return isWholesale ? item.price : applyBusinessMultiplier(item.price, adminSettings);
  }

  // Check for process-specific pricing
  if (item?.processPrice && typeof item.processPrice === 'number') {
    return isWholesale ? item.processPrice : applyBusinessMultiplier(item.processPrice, adminSettings);
  }

  // Check for universal pricing structure (tasks)
  if (item?.universalPricing && repairMetalType && karat) {
    const metalKey = generateMetalKey(repairMetalType, karat);
    
    // Try the generated key first (space format: "Sterling Silver 925")
    if (metalKey && item.universalPricing[metalKey]) {
      const pricing = item.universalPricing[metalKey];
      const basePrice = isWholesale ? 
        (pricing.wholesalePrice || pricing.retailPrice || pricing.totalCost || 0) :
        (pricing.retailPrice || pricing.totalCost || 0);
      return isWholesale ? basePrice : applyBusinessMultiplier(basePrice, adminSettings);
    }
    
    // Try underscore format (task data format: "sterling_silver_925")
    const underscoreKey = generateUnderscoreMetalKey(repairMetalType, karat);
    
    if (underscoreKey && item.universalPricing[underscoreKey]) {
      const pricing = item.universalPricing[underscoreKey];
      const basePrice = isWholesale ? 
        (pricing.wholesalePrice || pricing.retailPrice || pricing.totalCost || 0) :
        (pricing.retailPrice || pricing.totalCost || 0);
      return isWholesale ? basePrice : applyBusinessMultiplier(basePrice, adminSettings);
    }
  }

  // Check for process pricing structure
  if (item?.pricing?.totalCost) {
    // If totalCost is a number (universal pricing)
    if (typeof item.pricing.totalCost === 'number') {
      const basePrice = item.pricing.totalCost;
      return isWholesale ? basePrice : applyBusinessMultiplier(basePrice, adminSettings);
    }
    
    // If totalCost is an object (metal-specific pricing)
    if (typeof item.pricing.totalCost === 'object' && repairMetalType && karat) {
      const metalKey = generateMetalKey(repairMetalType, karat);
      
      if (metalKey && item.pricing.totalCost[metalKey]) {
        const totalCost = item.pricing.totalCost[metalKey];
        return isWholesale ? totalCost : applyBusinessMultiplier(totalCost, adminSettings);
      }
      
      // Try underscore format for processes too
      const underscoreKey = generateUnderscoreMetalKey(repairMetalType, karat);
      
      if (underscoreKey && item.pricing.totalCost[underscoreKey]) {
        const totalCost = item.pricing.totalCost[underscoreKey];
        return isWholesale ? totalCost : applyBusinessMultiplier(totalCost, adminSettings);
      }
    }
  }

  // If no universal price, look in sturllerProducts (note: checking both spellings)
  const stullerProducts = item?.sturllerProducts || item?.stullerProducts;
  if (stullerProducts && Array.isArray(stullerProducts)) {
    // Check if this is a non-metal-dependent item (has products with null metalType)
    const hasNonMetalProduct = stullerProducts.some(p => p.metalType === null || p.metalType === undefined);
    
    if (hasNonMetalProduct && (!karat || !repairMetalType)) {
      // Use the first non-metal product for universal items
      const universalProduct = stullerProducts.find(p => p.metalType === null || p.metalType === undefined);
      if (universalProduct) {
        const selectedPrice = isWholesale ? 
          (universalProduct.wholesalePrice || universalProduct.pricePerPortion || universalProduct.markedUpPrice || 0) :
          (universalProduct.pricePerPortion || universalProduct.markedUpPrice || 0);
        return isWholesale ? selectedPrice : applyBusinessMultiplier(selectedPrice, adminSettings);
      }
    } else if (hasNonMetalProduct) {
      // Even if karat/metalType are provided, for non-metal items use universal price
      const universalProduct = stullerProducts.find(p => p.metalType === null || p.metalType === undefined);
      if (universalProduct) {
        const selectedPrice = isWholesale ? 
          (universalProduct.wholesalePrice || universalProduct.pricePerPortion || universalProduct.markedUpPrice || 0) :
          (universalProduct.pricePerPortion || universalProduct.markedUpPrice || 0);
        return isWholesale ? selectedPrice : applyBusinessMultiplier(selectedPrice, adminSettings);
      }
    }

    // Find product with exact metal type match
    const matchingProduct = stullerProducts.find(product => {
      if (karat) {
        // Match both metalType and karat separately
        const metalTypeMatches = product.metalType === repairMetalType.replace('-', '_');
        const karatMatches = product.karat === karat.toUpperCase();
        return metalTypeMatches && karatMatches;
      } else {
        // Use simple string comparison as fallback
        const productMetalKey = product.metalType?.toLowerCase()?.replace(/\s+/g, '-') || '';
        const targetMetalKey = repairMetalType?.toLowerCase()?.replace(/\s+/g, '-') || '';
        return productMetalKey === targetMetalKey;
      }
    });

    if (matchingProduct) {
      const selectedPrice = isWholesale ? 
        (matchingProduct.wholesalePrice || matchingProduct.pricePerPortion || matchingProduct.markedUpPrice || 0) :
        (matchingProduct.pricePerPortion || matchingProduct.markedUpPrice || 0);
      return isWholesale ? selectedPrice : applyBusinessMultiplier(selectedPrice, adminSettings);
    }
  }

  // Legacy fallback for old data structure
  const metalKey = generateMetalKey(repairMetalType, karat);
  
  if (item?.metalSpecificPricing && item.metalSpecificPricing[metalKey]) {
    const legacyPrice = item.metalSpecificPricing[metalKey];
    return isWholesale ? legacyPrice : applyBusinessMultiplier(legacyPrice, adminSettings);
  }

  return 0;
};

/**
 * Format metal label for pricing lookup
 * @param {string} metalType 
 * @param {string} karat 
 * @returns {string}
 */
function formatMetalLabel(metalType, karat) {
  const metalTypeMap = {
    'gold': 'Yellow Gold',
    'white_gold': 'White Gold',
    'rose_gold': 'Rose Gold',
    'silver': 'Sterling Silver',
    'platinum': 'Platinum',
    'palladium': 'Palladium'
  };
  
  const metalLabel = metalTypeMap[metalType] || metalType;
  
  if (metalType === 'silver' && karat === '925') {
    return 'Sterling Silver 925';
  }
  
  return `${metalLabel} ${karat.toUpperCase()}`;
}

/**
 * Check if an item supports the specified metal type
 * @param {Object} item - Task, process, or material
 * @param {string} metalType - The metal type to check
 * @param {string} karat - The karat to check
 * @returns {boolean}
 */
export function supportsMetalType(item, metalType, karat) {
  if (!item || !metalType) {
    return false;
  }
  
  // Items that are not metal dependent support all metals
  if (item.isMetalDependent === false) {
    return true;
  }
  
  // For processes, check if any materials are non-metal-dependent
  if (item.materials && Array.isArray(item.materials)) {
    const hasNonMetalDependentMaterials = item.materials.some(material => {
      return material.isMetalDependent === false || 
             (material.stullerProducts && material.stullerProducts.some(product => 
               product.metalType === null || product.metalType === undefined
             ));
    });
    
    if (hasNonMetalDependentMaterials && !item.materials.some(material => material.isMetalDependent === true)) {
      return true;
    }
  }
  
  // Universal tasks support all metals by design
  if (item.isUniversal || item.supportsAllMetals) {
    return true;
  }
  
  // Check universal pricing structure
  if (item.universalPricing) {
    const metalKey = generateMetalKey(metalType, karat);
    const isSupported = metalKey && item.universalPricing[metalKey];
    return !!isSupported;
  }
  
  // Check process pricing structure
  if (item.pricing?.totalCost && typeof item.pricing.totalCost === 'object') {
    const metalKey = generateMetalKey(metalType, karat);
    const isSupported = metalKey && item.pricing.totalCost[metalKey];
    return !!isSupported;
  }
  
  // Check material unit cost structure  
  if (item.pricing?.unitCost && typeof item.pricing.unitCost === 'object') {
    const metalKey = generateMetalKey(metalType, karat);
    const isSupported = metalKey && item.pricing.unitCost[metalKey];
    return !!isSupported;
  }
  
  // Check material cost per portion structure
  if (item.pricing?.costPerPortion && typeof item.pricing.costPerPortion === 'object') {
    const metalKey = generateMetalKey(metalType, karat);
    const isSupported = metalKey && item.pricing.costPerPortion[metalKey];
    return !!isSupported;
  }
  
  // Check material Stuller products
  if (item.stullerProducts && Array.isArray(item.stullerProducts)) {
    const metalKey = generateMetalKey(metalType, karat);
    
    const isSupported = item.stullerProducts.some(product => {
      // Convert Stuller product data to match our format
      let normalizedMetalType = product.metalType;
      let normalizedKarat = product.karat;
      
      // Map old format to new format
      if (normalizedMetalType === 'yellow_gold') {
        normalizedMetalType = 'yellow-gold';
      } else if (normalizedMetalType === 'white_gold') {
        normalizedMetalType = 'white-gold';
      } else if (normalizedMetalType === 'rose_gold') {
        normalizedMetalType = 'rose-gold';
      } else if (normalizedMetalType === 'sterling_silver') {
        normalizedMetalType = 'sterling-silver';
      }
      
      // Normalize karat format (ensure 'k' suffix is present and lowercase)
      if (normalizedKarat && typeof normalizedKarat === 'string') {
        // Remove any existing K/k suffix, then add lowercase k
        normalizedKarat = normalizedKarat.replace(/[Kk]$/, '').toLowerCase() + 'k';
      } else if (normalizedKarat && typeof normalizedKarat === 'number') {
        // Convert number to string with k suffix
        normalizedKarat = normalizedKarat.toString() + 'k';
      }
      
      const productMetalKey = generateMetalKey(normalizedMetalType, normalizedKarat);
      return productMetalKey === metalKey;
    });
    return isSupported;
  }
  
  // Check material metal dependency
  if (item.isMetalDependent && item.metalTypes && Array.isArray(item.metalTypes)) {
    const standardMetalType = metalType === 'gold' ? 'yellow_gold' : metalType;
    const isSupported = item.metalTypes.includes(standardMetalType);
    return isSupported;
  }
  
  // Legacy fallback - if no metal-specific pricing, assume it supports all
  return true;
}

/**
 * Get available metal types for an item
 * @param {Object} item - Task, process, or material
 * @returns {Array} Array of {metalType, karat} objects
 */
export function getAvailableMetalTypes(item) {
  if (!item) return [];
  
  const metalTypes = [];
  
  // Universal pricing structure
  if (item.universalPricing) {
    Object.keys(item.universalPricing).forEach(metalKey => {
      const parsed = parseMetalKey(metalKey);
      if (parsed) {
        metalTypes.push(parsed);
      }
    });
    return metalTypes;
  }
  
  // Process pricing structure
  if (item.pricing?.totalCost && typeof item.pricing.totalCost === 'object') {
    Object.keys(item.pricing.totalCost).forEach(metalLabel => {
      const parsed = parseMetalLabel(metalLabel);
      if (parsed) {
        metalTypes.push(parsed);
      }
    });
    return metalTypes;
  }
  
  // Material Stuller products
  if (item.stullerProducts && Array.isArray(item.stullerProducts)) {
    item.stullerProducts.forEach(product => {
      if (product.metalType && product.karat) {
        metalTypes.push({
          metalType: product.metalType,
          karat: product.karat
        });
      }
    });
    return metalTypes;
  }
  
  return [];
}

/**
 * Parse metal key back to metalType and karat
 * @param {string} metalKey 
 * @returns {Object|null}
 */
function parseMetalKey(metalKey) {
  const parts = metalKey.split('_');
  if (parts.length < 2) return null;
  
  const karat = parts.pop();
  const metalType = parts.join('_');
  
  return { metalType, karat };
}

/**
 * Parse metal label back to metalType and karat
 * @param {string} metalLabel 
 * @returns {Object|null}
 */
function parseMetalLabel(metalLabel) {
  const labelMap = {
    'Sterling Silver 925': { metalType: 'silver', karat: '925' },
    'Yellow Gold 10K': { metalType: 'gold', karat: '10K' },
    'Yellow Gold 14K': { metalType: 'gold', karat: '14K' },
    'Yellow Gold 18K': { metalType: 'gold', karat: '18K' },
    'White Gold 10K': { metalType: 'white_gold', karat: '10K' },
    'White Gold 14K': { metalType: 'white_gold', karat: '14K' },
    'White Gold 18K': { metalType: 'white_gold', karat: '18K' },
    'Rose Gold 14K': { metalType: 'rose_gold', karat: '14K' },
    'Rose Gold 18K': { metalType: 'rose_gold', karat: '18K' }
  };
  
  return labelMap[metalLabel] || null;
}
