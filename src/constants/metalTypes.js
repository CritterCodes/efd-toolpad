/**
 * Metal Types and Specifications for COG Calculations
 * Specific gravity values for density calculations
 */

export const METAL_TYPES = {
  // Gold Variants (10K, 14K, 18K in Red, White, Yellow)
  GOLD_10K_RED: { label: '10K Red Gold', sg: 11.59, category: 'gold', karats: 10, color: 'red' },
  GOLD_10K_WHITE: { label: '10K White Gold', sg: 11.07, category: 'gold', karats: 10, color: 'white' },
  GOLD_10K_YELLOW: { label: '10K Yellow Gold', sg: 11.57, category: 'gold', karats: 10, color: 'yellow' },
  
  GOLD_14K_RED: { label: '14K Red Gold', sg: 13.26, category: 'gold', karats: 14, color: 'red' },
  GOLD_14K_WHITE: { label: '14K White Gold', sg: 12.61, category: 'gold', karats: 14, color: 'white' },
  GOLD_14K_YELLOW: { label: '14K Yellow Gold', sg: 13.07, category: 'gold', karats: 14, color: 'yellow' },
  
  GOLD_18K_RED: { label: '18K Red Gold', sg: 15.18, category: 'gold', karats: 18, color: 'red' },
  GOLD_18K_WHITE: { label: '18K White Gold', sg: 14.64, category: 'gold', karats: 18, color: 'white' },
  GOLD_18K_YELLOW: { label: '18K Yellow Gold', sg: 15.58, category: 'gold', karats: 18, color: 'yellow' },
  
  // Silver Variants
  SILVER_STERLING: { label: 'Sterling Silver (.925)', sg: 10.40, category: 'silver', purity: 0.925 },
  
  // Platinum Variants
  PLATINUM_IRIDIUM: { label: 'Platinum/Iridium (90/10)', sg: 21.54, category: 'platinum' },
  
  // Reference (Wax)
  WAX: { label: 'Wax (Reference)', sg: 1.00, category: 'reference' },
};

/**
 * Group metals by category for UI organization
 */
export const METAL_GROUPS = {
  gold: {
    label: 'Gold',
    metals: [
      METAL_TYPES.GOLD_10K_RED,
      METAL_TYPES.GOLD_10K_WHITE,
      METAL_TYPES.GOLD_10K_YELLOW,
      METAL_TYPES.GOLD_14K_RED,
      METAL_TYPES.GOLD_14K_WHITE,
      METAL_TYPES.GOLD_14K_YELLOW,
      METAL_TYPES.GOLD_18K_RED,
      METAL_TYPES.GOLD_18K_WHITE,
      METAL_TYPES.GOLD_18K_YELLOW,
    ],
  },
  silver: {
    label: 'Silver',
    metals: [
      METAL_TYPES.SILVER_STERLING,
    ],
  },
  platinum: {
    label: 'Platinum',
    metals: [
      METAL_TYPES.PLATINUM_IRIDIUM,
    ],
  },
};

/**
 * Metal prices are stored in the database and updated daily
 * Structure: { metalCategory: price_per_gram }
 * Example: { gold: 65.25, silver: 0.82 }
 */
export const METAL_PRICE_CATEGORIES = {
  gold: 'Gold (24K)', // 24K gold price from API, automatically adjusted for karat
  silver: 'Silver',
  platinum: 'Platinum',
  palladium: 'Palladium',
};

/**
 * Get all metal options as a flat array for UI rendering
 * @returns Array of { key, label, category, group } objects
 */
export function getAllMetalOptions() {
  const options = [];
  
  // Iterate through all metals and add them if they're not WAX
  Object.entries(METAL_TYPES).forEach(([metalKey, metalData]) => {
    if (metalKey !== 'WAX') { // Exclude WAX reference metal
      const groupName = metalData.category.charAt(0).toUpperCase() + metalData.category.slice(1);
      options.push({
        key: metalKey,
        label: metalData.label,
        category: metalData.category,
        group: groupName
      });
    }
  });
  
  return options;
}

/**
 * Calculate wax weight from model volume
 * @param volumeMm3 - Volume in cubic millimeters
 * @returns Weight in grams
 */
export function calculateWaxWeight(volumeMm3) {
  if (!volumeMm3 || volumeMm3 <= 0) return 0;
  return volumeMm3 * 0.001; // 1mm³ of wax = 0.001g
}

/**
 * Calculate metal weight from wax weight and specific gravity
 * @param waxWeightG - Wax weight in grams
 * @param specificGravity - Specific gravity of the metal
 * @returns Metal weight in grams
 */
export function calculateMetalWeight(waxWeightG, specificGravity) {
  if (!waxWeightG || !specificGravity) return 0;
  return waxWeightG * specificGravity;
}

/**
 * Get metal price category for a metal type
 * @param metalKey - Key from METAL_TYPES
 * @returns Price category key for database lookup
 */
export function getMetalPriceCategory(metalKey) {
  const metal = METAL_TYPES[metalKey];
  if (!metal) return null;
  
  if (metal.category === 'gold') {
    return 'gold';
  } else if (metal.category === 'silver') {
    return 'silver';
  } else if (metal.category === 'platinum') {
    return 'platinum';
  } else if (metalKey === 'PALLADIUM') {
    return 'palladium';
  }
  
  return null;
}

/**
 * Adjust price for karat (gold) or purity (silver)
 * @param pricePerGram - Base price per gram (24K gold or .999 silver)
 * @param metalKey - Key from METAL_TYPES
 * @returns Adjusted price per gram
 */
export function adjustPriceForPurity(pricePerGram, metalKey) {
  const metal = METAL_TYPES[metalKey];
  if (!metal || !pricePerGram) return 0;
  
  // For gold: adjust by karat (e.g., 14K = 14/24 of 24K price)
  if (metal.category === 'gold' && metal.karats) {
    return (pricePerGram * metal.karats) / 24;
  }
  
  // For silver: adjust by purity (e.g., .925 = 92.5% of .999 price)
  if (metal.category === 'silver' && metal.purity) {
    return pricePerGram * metal.purity;
  }
  
  // Other metals use base price
  return pricePerGram;
}

/**
 * Calculate total metal cost
 * @param metalWeightG - Metal weight in grams
 * @param pricePerGram - Price per gram (adjusted for purity)
 * @returns Total cost (includes 1.3x markup for casting house labor)
 */
export function calculateMetalCost(metalWeightG, pricePerGram) {
  if (!metalWeightG || !pricePerGram) return 0;
  // Apply 1.3x markup to account for casting house labor
  return metalWeightG * pricePerGram * 1.3;
}

/**
 * Calculate total mounting COG including labor
 * @param metalCost - Cost of metal
 * @param laborCharge - Labor charge (default $15)
 * @returns Total COG
 */
export function calculateMountingCOG(metalCost, laborCharge = 15) {
  return metalCost + laborCharge;
}
