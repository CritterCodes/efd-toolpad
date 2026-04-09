import { DEFAULT_MATERIAL_FORM } from './materials.constants';

export const validateMaterialForm = (formData) => {
  const errors = [];

  if (!formData.displayName?.trim()) {
    errors.push('Display name is required');
  }

  if (!formData.category) {
    errors.push('Category is required');
  }

  if (!formData.unitType) {
    errors.push('Unit type is required');
  }

  if (!formData.unitCost || parseFloat(formData.unitCost) <= 0) {
    errors.push('Unit cost must be greater than 0');
  }

  if (formData.portionsPerUnit && parseInt(formData.portionsPerUnit) < 1) {
    errors.push('Portions per unit must be at least 1');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Prepare form data for API submission
 * @param {Object} formData - Raw form data
 * @returns {Object} Processed data ready for API
 */
export const prepareFormDataForSubmission = (formData) => {
  return {
    ...formData,
    unitCost: parseFloat(formData.unitCost) || 0,
    portionsPerUnit: parseInt(formData.portionsPerUnit) || 1,
    costPerPortion: parseFloat(formData.costPerPortion) || 0,
    isActive: formData.isActive !== false
  };
};

/**
 * Transform material data for form editing
 * @param {Object} material - Material object from API
 * @returns {Object} Form data object
 */
export const transformMaterialForForm = (material) => {
  // Multi-variant structure (only format we support now)
  return {
    // General material information from the material root
    name: material.name || '',
    displayName: material.displayName || '',
    category: material.category || '',
    unitType: material.unitType || 'application',
    supplier: material.supplier || 'Stuller',
    description: material.description || '',
    isActive: material.isActive !== false,
    
    // Metal dependency configuration - respect explicit values
    isMetalDependent: material.hasOwnProperty('isMetalDependent') ? Boolean(material.isMetalDependent) : true,
    
    portionsPerUnit: material.portionsPerUnit || 1,
    portionType: material.portionType || 'piece',
    unitCost: material.unitCost || 0,
    
    // Multi-variant structure - preserve the stullerProducts array
    stullerProducts: material.stullerProducts || []
  };
};

/**
 * Process form data for API submission, handling custom types
 * @param {Object} formData - Raw form data from the form
 * @returns {Object} Processed data ready for API
 */
export const processFormDataForSubmission = (formData) => {
  // With autocomplete, custom values are stored directly in unitType and portionType
  // No special processing needed - just clean up any empty strings
  const processedData = { ...formData };
  
  // Ensure we have valid values
  if (!processedData.unitType?.trim()) {
    processedData.unitType = 'application';
  }
  
  if (!processedData.portionType?.trim()) {
    processedData.portionType = 'piece';
  }

  return processedData;
};

/**
 * Filter materials by search criteria
 * @param {Array} materials - Array of materials
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered materials
 */