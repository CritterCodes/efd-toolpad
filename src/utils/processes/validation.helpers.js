import { SKILL_LEVELS, DEFAULT_PROCESS_FORM } from '@/constants/processes.constants';
import pricingEngine from '@/services/PricingEngine';

/**
 * Validate process form data
 */
export const validateProcessForm = (formData) => {
  const errors = {};

  if (!formData.displayName || !formData.displayName.trim()) {
    errors.displayName = 'Display name is required';
  }

  if (!formData.category || !formData.category.trim()) {
    errors.category = 'Category is required';
  }

  const laborHours = parseFloat(formData.laborHours);
  if (isNaN(laborHours) || laborHours < 0 || laborHours > 8) {
    errors.laborHours = 'Labor hours must be between 0 and 8';
  }

  if (formData.skillLevel && !SKILL_LEVELS.some(s => s.value === formData.skillLevel)) {
    errors.skillLevel = 'Invalid skill level';
  }

  const multiplier = parseFloat(formData.metalComplexityMultiplier);
  if (isNaN(multiplier) || multiplier < 0.1 || multiplier > 5.0) {
    errors.metalComplexityMultiplier = 'Complexity multiplier must be between 0.1 and 5.0';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Calculate process cost for all relevant metal types based on materials
 * 
 * @deprecated This function is deprecated. Use PricingEngine.calculateProcessCost() instead.
 * This function now calls PricingEngine internally for backward compatibility.
 * 
 * @param {Object} formData - Process form data
 * @param {Object} adminSettings - Admin settings for labor rates and metal multipliers
 * @param {Array} availableMaterials - Array of all available materials with full data
 * @returns {Object} Cost breakdown for each relevant metal type
 */
export const calculateProcessCost = (formData, adminSettings, availableMaterials = []) => {
  console.warn('⚠️ DEPRECATED: calculateProcessCost() - Please migrate to PricingEngine.calculateProcessCost()');
  
  // Use PricingEngine for consistent calculations
  if (!adminSettings || !formData.laborHours || !formData.skillLevel) {
    return null;
  }
  
  return pricingEngine.calculateProcessCost(formData, adminSettings);
};

/**
 * Prepare process data with calculated prices for saving
 * @param {Object} formData - Process form data
 * @param {Object} adminSettings - Admin settings
 * @param {Array} availableMaterials - Array of all available materials
 * @returns {Object} Process data ready for saving
 */
export const prepareProcessForSaving = (formData) => {
  // Store only raw source fields — pricing computed at runtime via PricingEngine
  const materials = (formData.materials || []).map(material => ({
    materialId: material.materialId || material._id,
    materialSku: material.materialSku,
    quantity: material.quantity || 1
  }));

  return {
    displayName: formData.displayName,
    category: formData.category,
    laborHours: parseFloat(formData.laborHours) || 0,
    skillLevel: formData.skillLevel,
    description: formData.description,
    materials,
    isActive: formData.isActive !== false,
    createdAt: new Date(),
    updatedAt: new Date()
  };
};

export const transformProcessForForm = (process) => {
  if (!process) return { ...DEFAULT_PROCESS_FORM };

  return {
    displayName: process.displayName || '',
    category: process.category || '',
    laborHours: process.laborHours || 0,
    skillLevel: process.skillLevel || 'standard',
    description: process.description || '',
    materials: process.materials || [],
    isActive: process.isActive !== false
  };
};
