import { METAL_OPTIONS, KARAT_OPTIONS } from './materials.constants';

export const formatCategoryDisplay = (category) => {
  return category.replace('_', ' ').toUpperCase();
};

/**
 * Format unit type display name
 * @param {string} unitType - Internal unit type
 * @returns {string} Formatted display name
 */
export const formatUnitTypeDisplay = (unitType) => {
  return unitType.toUpperCase();
};

/**
 * Get metal option label by value
 * @param {string} metalValue - Metal value
 * @returns {string} Metal label or the value if not found
 */
export const getMetalLabel = (metalValue) => {
  const metal = METAL_OPTIONS.find(m => m.value === metalValue);
  return metal?.label || metalValue;
};

/**
 * Get karat option label by value
 * @param {string} karatValue - Karat value
 * @returns {string} Karat label or the value if not found
 */
export const getKaratLabel = (karatValue) => {
  const karat = KARAT_OPTIONS.find(k => k.value === karatValue);
  return karat?.label || karatValue;
};

/**
 * Format price display
 * @param {number} price - Price value
 * @returns {string} Formatted price string
 */
export const formatPrice = (price) => {
  return `$${(price || 0).toFixed(2)}`;
};

/**
 * Format portion price display
 * @param {number} price - Price value
 * @returns {string} Formatted portion price string (4 decimal places)
 */
export const formatPortionPrice = (price) => {
  return `$${(price || 0).toFixed(4)}`;
};

/**
 * Check if material has portions
 * @param {Object} material - Material object
 * @returns {boolean} True if material has portions
 */
export const hasPortions = (material) => {
  return material.portionsPerUnit && material.portionsPerUnit > 1;
};

/**
 * Calculate portion price for display
 * @param {number} unitCost - Unit cost
 * @param {number} portionsPerUnit - Portions per unit
 * @returns {number} Calculated portion price
 */
export const calculatePortionPrice = (unitCost, portionsPerUnit) => {
  const cost = parseFloat(unitCost) || 0;
  const portions = parseInt(portionsPerUnit) || 1;
  return portions > 0 ? cost / portions : 0;
};

/**
 * Validate material form data
 * @param {Object} formData - Form data to validate
 * @returns {Object} Validation result with isValid and errors
 */