/**
 * Pricing Constants - Single Source of Truth
 * 
 * All multiplier definitions and default values for job costing calculations.
 * This file serves as the single source of truth for all pricing-related constants.
 * 
 * @module pricing.constants
 */

/**
 * Skill Level Multipliers
 * Applied to base hourly wage to calculate skill-adjusted rates
 */
export const SKILL_LEVEL_MULTIPLIERS = {
  basic: 0.75,      // 75% of base rate
  standard: 1.0,   // 100% of base rate (default)
  advanced: 1.25,   // 125% of base rate
  expert: 1.5      // 150% of base rate
};

/**
 * Default Material Markup Multiplier
 * Applied to base material costs to calculate marked-up material prices
 * 
 * NOTE: This is the standard default. Individual admin settings may override.
 */
export const DEFAULT_MATERIAL_MARKUP = 2.0; // 100% markup (2.0x)

/**
 * Minimum Material Markup Multiplier
 * Enforced minimum markup to ensure profitability
 */
export const MINIMUM_MATERIAL_MARKUP = 2.0; // Must be at least 2.0x

/**
 * Default Business Fee Structure
 * Used to calculate business multiplier when admin settings are unavailable
 */
export const DEFAULT_BUSINESS_FEES = {
  administrativeFee: 0.10,  // 10% of base cost
  businessFee: 0.15,        // 15% of base cost
  consumablesFee: 0.05       // 5% of base cost
};

/**
 * Default Business Multiplier
 * Calculated from default fees: (0.10 + 0.15 + 0.05) + 1 = 1.30x
 */
export const DEFAULT_BUSINESS_MULTIPLIER = (
  DEFAULT_BUSINESS_FEES.administrativeFee +
  DEFAULT_BUSINESS_FEES.businessFee +
  DEFAULT_BUSINESS_FEES.consumablesFee
) + 1; // = 1.30x

/**
 * Minimum Business Multiplier
 * Enforced minimum to ensure profitability
 */
export const MINIMUM_BUSINESS_MULTIPLIER = 2.0; // Must be at least 2.0x

/**
 * Default Metal Complexity Multipliers
 * Applied to process costs based on metal type complexity
 */
export const DEFAULT_METAL_COMPLEXITY_MULTIPLIERS = {
  gold: 1.0,
  silver: 0.9,
  platinum: 1.3,
  palladium: 1.2,
  copper: 0.8,
  brass: 0.7,
  stainless: 0.8,
  titanium: 1.4,
  other: 1.0
};

/**
 * Default Base Hourly Wage
 * Used when admin settings are unavailable
 */
export const DEFAULT_BASE_WAGE = 50.00;

/**
 * Wholesale Pricing Formula Type
 * Determines how wholesale prices are calculated
 */
export const WHOLESALE_FORMULA_TYPE = {
  PERCENTAGE_OF_RETAIL: 'percentage_of_retail',  // retailPrice * percentage
  BUSINESS_MULTIPLIER_ADJUSTMENT: 'business_multiplier_adjustment', // baseCost * (businessMultiplier * adjustment)
  FORMULA_BASED: 'formula_based' // ((admin + business + consumables) / 2) + 1
};

/**
 * Default Wholesale Pricing Configuration
 */
export const DEFAULT_WHOLESALE_CONFIG = {
  type: WHOLESALE_FORMULA_TYPE.FORMULA_BASED,
  percentage: 0.5,  // 50% of retail (if using percentage)
  adjustment: 0.75,  // 75% of business multiplier (if using adjustment)
  minimumMultiplier: 1.5  // Minimum 1.5x for wholesale
};

/**
 * Calculate business multiplier from fees
 * @param {Object} fees - Fee structure {administrativeFee, businessFee, consumablesFee}
 * @returns {number} Business multiplier
 */
export function calculateBusinessMultiplier(fees = {}) {
  const {
    administrativeFee = DEFAULT_BUSINESS_FEES.administrativeFee,
    businessFee = DEFAULT_BUSINESS_FEES.businessFee,
    consumablesFee = DEFAULT_BUSINESS_FEES.consumablesFee
  } = fees;

  return (administrativeFee + businessFee + consumablesFee) + 1;
}

/**
 * Get skill level multiplier
 * @param {string} skillLevel - Skill level (basic, standard, advanced, expert)
 * @returns {number} Skill level multiplier
 */
export function getSkillLevelMultiplier(skillLevel) {
  return SKILL_LEVEL_MULTIPLIERS[skillLevel?.toLowerCase()] || SKILL_LEVEL_MULTIPLIERS.standard;
}

/**
 * Get metal complexity multiplier
 * @param {string} metalType - Metal type
 * @param {Object} customMultipliers - Custom multipliers from admin settings
 * @returns {number} Metal complexity multiplier
 */
export function getMetalComplexityMultiplier(metalType, customMultipliers = {}) {
  const multipliers = { ...DEFAULT_METAL_COMPLEXITY_MULTIPLIERS, ...customMultipliers };
  return multipliers[metalType?.toLowerCase()] || multipliers.other || 1.0;
}

/**
 * Enforce minimum material markup
 * @param {number} markup - Current markup value
 * @param {number} minimum - Minimum required markup (default: MINIMUM_MATERIAL_MARKUP)
 * @returns {number} Enforced markup (original or minimum, whichever is higher)
 */
export function enforceMinimumMaterialMarkup(markup, minimum = MINIMUM_MATERIAL_MARKUP) {
  return Math.max(markup, minimum);
}

/**
 * Enforce minimum business multiplier
 * @param {number} multiplier - Current business multiplier
 * @param {number} minimum - Minimum required multiplier (default: MINIMUM_BUSINESS_MULTIPLIER)
 * @returns {number} Enforced multiplier (original or minimum, whichever is higher)
 */
export function enforceMinimumBusinessMultiplier(multiplier, minimum = MINIMUM_BUSINESS_MULTIPLIER) {
  return Math.max(multiplier, minimum);
}

/**
 * Enforce minimum wholesale multiplier
 * @param {number} multiplier - Current wholesale multiplier
 * @param {number} minimum - Minimum required multiplier (default: DEFAULT_WHOLESALE_CONFIG.minimumMultiplier)
 * @returns {number} Enforced multiplier (original or minimum, whichever is higher)
 */
export function enforceMinimumWholesaleMultiplier(multiplier, minimum = DEFAULT_WHOLESALE_CONFIG.minimumMultiplier) {
  return Math.max(multiplier, minimum);
}

/**
 * Calculate hourly rate for skill level
 * @param {number} baseWage - Base hourly wage
 * @param {string} skillLevel - Skill level
 * @returns {number} Adjusted hourly rate
 */
export function calculateHourlyRateForSkill(baseWage, skillLevel) {
  const multiplier = getSkillLevelMultiplier(skillLevel);
  return baseWage * multiplier;
}

/**
 * Validate pricing constants
 * Ensures all constants are within acceptable ranges
 * @returns {Object} Validation result {valid: boolean, errors: string[]}
 */
export function validatePricingConstants() {
  const errors = [];

  // Validate skill multipliers
  Object.entries(SKILL_LEVEL_MULTIPLIERS).forEach(([level, multiplier]) => {
    if (multiplier < 0 || multiplier > 3) {
      errors.push(`Invalid skill multiplier for ${level}: ${multiplier} (must be 0-3)`);
    }
  });

  // Validate material markup
  if (DEFAULT_MATERIAL_MARKUP < 1 || DEFAULT_MATERIAL_MARKUP > 10) {
    errors.push(`Invalid default material markup: ${DEFAULT_MATERIAL_MARKUP} (must be 1-10)`);
  }

  // Validate business fees
  Object.entries(DEFAULT_BUSINESS_FEES).forEach(([fee, value]) => {
    if (value < 0 || value > 1) {
      errors.push(`Invalid business fee ${fee}: ${value} (must be 0-1)`);
    }
  });

  // Validate minimum multipliers
  if (MINIMUM_MATERIAL_MARKUP < 1) {
    errors.push(`Invalid minimum material markup: ${MINIMUM_MATERIAL_MARKUP} (must be >= 1)`);
  }

  if (MINIMUM_BUSINESS_MULTIPLIER < 1) {
    errors.push(`Invalid minimum business multiplier: ${MINIMUM_BUSINESS_MULTIPLIER} (must be >= 1)`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Export all constants as default object for convenience
export default {
  SKILL_LEVEL_MULTIPLIERS,
  DEFAULT_MATERIAL_MARKUP,
  MINIMUM_MATERIAL_MARKUP,
  DEFAULT_BUSINESS_FEES,
  DEFAULT_BUSINESS_MULTIPLIER,
  MINIMUM_BUSINESS_MULTIPLIER,
  DEFAULT_METAL_COMPLEXITY_MULTIPLIERS,
  DEFAULT_BASE_WAGE,
  WHOLESALE_FORMULA_TYPE,
  DEFAULT_WHOLESALE_CONFIG,
  calculateBusinessMultiplier,
  getSkillLevelMultiplier,
  getMetalComplexityMultiplier,
  enforceMinimumMaterialMarkup,
  enforceMinimumBusinessMultiplier,
  enforceMinimumWholesaleMultiplier,
  calculateHourlyRateForSkill,
  validatePricingConstants
};

