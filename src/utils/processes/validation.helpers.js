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
export const prepareProcessForSaving = (formData, adminSettings, availableMaterials = []) => {
  const costPreview = calculateProcessCost(formData, adminSettings, availableMaterials);
  
  // Enrich materials with full data from availableMaterials
  const enrichedMaterials = (formData.materials || []).map(material => {
    const fullMaterial = availableMaterials.find(m => 
      m.sku === material.materialSku || m._id === material.materialId
    );
    
    if (!fullMaterial) return material;
    
    return {
      ...material,
      materialName: fullMaterial.displayName || fullMaterial.name,
      stullerProducts: fullMaterial.stullerProducts || [],
      portionsPerUnit: fullMaterial.portionsPerUnit || 1,
      baseCostPerPortion: material.estimatedCost / material.quantity || 0,
      estimatedCost: material.estimatedCost || 0,
      isMetalDependent: fullMaterial.isMetalDependent || false,
      metalTypes: fullMaterial.stullerProducts ? 
        [...new Set(fullMaterial.stullerProducts.map(p => p.metalType).filter(Boolean))] : []
    };
  });

  const processData = {
    displayName: formData.displayName,
    category: formData.category,
    laborHours: parseFloat(formData.laborHours) || 0,
    skillLevel: formData.skillLevel,
    description: formData.description,
    materials: enrichedMaterials,
    isActive: formData.isActive !== false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Create the new pricing structure by delegating to PricingEngine
  if (costPreview) {
    // Generate fresh cost breakdown using standard engine
    const breakdown = pricingEngine.calculateProcessCost(processData, adminSettings);
    
    // Map the PricingEngine output to the DB schema structure
    if (breakdown.isMetalDependent && breakdown.metalPrices) {
       // Metal-dependent structure
       const materialsCost = {};
       const totalCost = {};
       
       Object.entries(breakdown.metalPrices).forEach(([variantKey, prices]) => {
         const metalLabel = prices.metalLabel || variantKey;
         materialsCost[metalLabel] = prices.materialsCost;
         totalCost[metalLabel] = prices.totalCost;
       });
       
       processData.pricing = {
         laborCost: breakdown.summary?.laborCost || breakdown.laborCost,
         baseMaterialsCost: breakdown.summary?.baseMaterialsCost || breakdown.baseMaterialsCost,
         materialsCost,
         materialMarkup: breakdown.materialMarkup || 2.0,
         totalCost,
         hourlyRate: breakdown.summary?.hourlyRate || breakdown.hourlyRate,
         calculatedAt: new Date()
       };
    } else {
      // Universal/Standard structure
      const coreData = breakdown.universal || breakdown;
      
      processData.pricing = {
        laborCost: coreData.laborCost,
        baseMaterialsCost: coreData.baseMaterialsCost || 0,
        materialsCost: { "universal": coreData.materialsCost },
        materialMarkup: coreData.materialMarkup,
        totalCost: { "universal": coreData.totalCost },
        hourlyRate: coreData.hourlyRate,
        calculatedAt: new Date()
      };
    }
  }

  return processData;
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
