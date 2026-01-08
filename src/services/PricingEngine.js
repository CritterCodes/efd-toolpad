/**
 * Pricing Engine - Centralized Pricing Calculation Service
 * 
 * Single source of truth for all pricing calculations following SOLID principles.
 * All job costing logic should use this service instead of scattered utility functions.
 * 
 * @module PricingEngine
 */

import {
  SKILL_LEVEL,
  DEFAULT_SKILL_LEVEL,
  VALID_SKILL_LEVELS,
  SKILL_LEVEL_MULTIPLIERS,
  DEFAULT_MATERIAL_MARKUP,
  MINIMUM_MATERIAL_MARKUP,
  DEFAULT_BUSINESS_MULTIPLIER,
  MINIMUM_BUSINESS_MULTIPLIER,
  DEFAULT_METAL_COMPLEXITY_MULTIPLIERS,
  DEFAULT_BASE_WAGE,
  WHOLESALE_FORMULA_TYPE,
  DEFAULT_WHOLESALE_CONFIG,
  ERROR_MESSAGES,
  calculateBusinessMultiplier,
  isValidSkillLevel,
  getSkillLevelMultiplier,
  getMetalComplexityMultiplier,
  enforceMinimumMaterialMarkup,
  enforceMinimumBusinessMultiplier,
  enforceMinimumWholesaleMultiplier,
  calculateHourlyRateForSkill
} from '@/constants/pricing.constants.mjs';

/**
 * Pricing Engine Class
 * Implements all pricing calculations with consistent logic
 */
class PricingEngine {
  /**
   * Get admin settings with defaults
   * @private
   * @param {Object} adminSettings - Admin settings object
   * @returns {Object} Normalized admin settings with defaults
   */
  _getNormalizedSettings(adminSettings = {}) {
    if (!adminSettings || typeof adminSettings !== 'object') {
      adminSettings = {};
    }
    const pricing = adminSettings.pricing || {};
    
    return {
      baseWage: pricing.wage || DEFAULT_BASE_WAGE,
      materialMarkup: pricing.materialMarkup || DEFAULT_MATERIAL_MARKUP,
      administrativeFee: pricing.administrativeFee || 0.10,
      businessFee: pricing.businessFee || 0.15,
      consumablesFee: pricing.consumablesFee || 0.05,
      metalComplexityMultipliers: adminSettings.metalComplexityMultipliers || DEFAULT_METAL_COMPLEXITY_MULTIPLIERS,
      wholesaleConfig: pricing.wholesaleConfig || DEFAULT_WHOLESALE_CONFIG
    };
  }

  /**
   * Calculate process cost
   * @param {Object} process - Process object with laborHours, skillLevel, materials, etc.
   * @param {Object} adminSettings - Admin settings
   * @returns {Object} Process cost breakdown
   * @throws {TypeError} If process is not an object
   * @throws {RangeError} If laborHours is negative
   */
  calculateProcessCost(process, adminSettings = {}) {
    // Guard clause: validate process parameter
    if (!process || typeof process !== 'object') {
      throw new TypeError(ERROR_MESSAGES.PROCESS_MUST_BE_OBJECT);
    }
    
    const settings = this._getNormalizedSettings(adminSettings);
    
    // Guard clause: validate labor hours (check before defaulting to 0)
    const parsedLaborHours = parseFloat(process.laborHours);
    if (isNaN(parsedLaborHours) && process.laborHours !== undefined && process.laborHours !== null) {
      throw new TypeError(ERROR_MESSAGES.PROCESS_LABOR_HOURS_MUST_BE_NUMBER);
    }
    const laborHours = parsedLaborHours || 0;
    
    if (laborHours < 0) {
      throw new RangeError(ERROR_MESSAGES.PROCESS_LABOR_HOURS_CANNOT_BE_NEGATIVE);
    }
    
    const skillLevel = process.skillLevel || DEFAULT_SKILL_LEVEL;
    
    // Guard clause: validate materials array if provided
    if (process.materials !== undefined && !Array.isArray(process.materials)) {
      throw new TypeError(ERROR_MESSAGES.PROCESS_MATERIALS_MUST_BE_ARRAY);
    }
    
    // Calculate labor cost with skill multiplier
    const hourlyRate = calculateHourlyRateForSkill(settings.baseWage, skillLevel);
    
    console.log('--- PricingEngine: calculateProcessCost ---');
    console.log('Skill Level:', skillLevel);
    console.log('Base Wage:', settings.baseWage);
    console.log('Hourly Rate:', hourlyRate);
    console.log('Labor Hours:', laborHours);
    
    const laborCost = laborHours * hourlyRate;
    console.log('Labor Cost:', laborCost);
    
    // Calculate base materials cost
    const baseMaterialsCost = (process.materials || []).reduce((total, material) => {
      return total + (material.estimatedCost || 0);
    }, 0);
    
    // Apply material markup with minimum enforcement
    const materialMarkup = enforceMinimumMaterialMarkup(settings.materialMarkup);
    const materialsCost = baseMaterialsCost * materialMarkup;
    
    // Apply metal complexity multiplier
    const metalType = process.metalType || 'other';
    const metalComplexity = getMetalComplexityMultiplier(metalType, settings.metalComplexityMultipliers);
    const metalComplexityMultiplier = process.metalComplexityMultiplier || metalComplexity;
    
    // Check for metal dependencies
    const isMetalDependent = process.isMetalDependent || (process.materials || []).some(m => m.isMetalDependent);
    
    if (isMetalDependent) {
      return this._calculateMetalDependentProcessCost(
        process, 
        settings, 
        laborCost, 
        hourlyRate, 
        skillLevel, 
        laborHours,
        materialMarkup
      );
    }

    // Calculate total cost
    const totalCost = (laborCost + materialsCost) * metalComplexityMultiplier;
    
    return {
      laborCost: Math.round(laborCost * 100) / 100,
      baseMaterialsCost: Math.round(baseMaterialsCost * 100) / 100,
      materialsCost: Math.round(materialsCost * 100) / 100,
      materialMarkup: materialMarkup,
      totalCost: Math.round(totalCost * 100) / 100,
      hourlyRate: Math.round(hourlyRate * 100) / 100,
      skillMultiplier: getSkillLevelMultiplier(skillLevel),
      metalComplexityMultiplier: metalComplexityMultiplier,
      laborHours: laborHours,
      calculatedAt: new Date().toISOString(),
      isMetalDependent: false
    };
  }

  /**
   * Calculate process cost for metal-dependent processes
   * @private
   */
  _calculateMetalDependentProcessCost(process, settings, laborCost, hourlyRate, skillLevel, laborHours, materialMarkup) {
    const metalPrices = {};
    const materials = process.materials || [];
    
    // Identify all relevant metal variants from stuller products
    // We group by metal type and karat
    const foundVariants = new Set();
    const variantMap = new Map(); // key -> { metalType, karat, label }

    materials.forEach(material => {
      if (material.isMetalDependent && Array.isArray(material.stullerProducts)) {
        material.stullerProducts.forEach(prod => {
          if (!prod.metalType || !prod.karat) return;
          
          // Create unique key for variant
          const key = `${prod.metalType}_${prod.karat}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
          
          if (!foundVariants.has(key)) {
            foundVariants.add(key);
            
            // Format label
            const metalLabel = prod.metalType.split('-')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            const label = `${metalLabel} ${prod.karat.toUpperCase()}`;
            
            variantMap.set(key, {
              metalType: prod.metalType,
              karat: prod.karat,
              label,
              key
            });
          }
        });
      }
    });

    // If no specific variants found but isMetalDependent is true, 
    // we might want to return default valid metals (common logic), 
    // but for now only use what's found in materials.
    
    const relevantVariantLabels = [];
    const universalMaterials = materials.filter(m => !m.isMetalDependent);
    
    // Calculate cost for each variant
    variantMap.forEach((variant, variantKey) => {
      let variantTotalMaterialsCost = 0;
      const materialBreakdown = [];
      
      // 1. Add non-dependent materials (universal cost)
      universalMaterials.forEach(m => {
        const cost = (m.estimatedCost || 0) * materialMarkup;
        variantTotalMaterialsCost += cost;
        materialBreakdown.push({
          name: m.displayName || m.name,
          quantity: m.quantity || 1,
          unitPrice: cost / (m.quantity || 1), // approximate
          total: cost
        });
      });
      
      // 2. Add dependent materials (variant specific cost)
      materials.filter(m => m.isMetalDependent).forEach(m => {
        // Find matching product
        const product = (m.stullerProducts || []).find(p => 
          p.metalType === variant.metalType && 
          p.karat === variant.karat
        );
        
        let cost = 0;
        let unitPrice = 0;
        
        if (product) {
          // Use product cost
          // unitCost is usually user-facing cost, but we need cost basis
          // In ProcessForm construction, costPerPortion is calculated
          // We need base cost to apply markup
          
          // Check if product has costPerPortion (migrated) or unitCost (raw)
          const basePrice = product.costPerPortion || product.unitCost || 0;
          const markedUp = basePrice * materialMarkup;
          const quantity = parseFloat(m.quantity) || 1;
          
          cost = markedUp * quantity;
          unitPrice = markedUp;
        }
        
        variantTotalMaterialsCost += cost;
        materialBreakdown.push({
          name: m.displayName || m.name,
          quantity: m.quantity || 1,
          unitPrice: unitPrice,
          total: cost,
          isVariant: true,
          found: !!product
        });
      });
      
      // Get complexity for this variant
      // Simplify metal type for complexity lookup (e.g. "yellow-gold" -> "gold")
      let complexityKey = 'other';
      const mt = variant.metalType.toLowerCase();
      
      if (mt.includes('platinum')) complexityKey = 'platinum';
      else if (mt.includes('palladium')) complexityKey = 'palladium';
      else if (mt.includes('gold')) complexityKey = 'gold';
      else if (mt.includes('silver')) complexityKey = 'silver';
      else if (mt.includes('titanium')) complexityKey = 'titanium';
      else if (mt.includes('stainless')) complexityKey = 'stainless';
      else if (mt.includes('brass')) complexityKey = 'brass';
      else if (mt.includes('copper')) complexityKey = 'copper';
      
      const metalComplexity = getMetalComplexityMultiplier(complexityKey, settings.metalComplexityMultipliers);
      
      // Calculate total
      const totalVariantCost = (laborCost + variantTotalMaterialsCost) * metalComplexity;
      
      metalPrices[variantKey] = {
        metalLabel: variant.label,
        materialsCost: Math.round(variantTotalMaterialsCost * 100) / 100,
        materialBreakdown: materialBreakdown,
        laborCost: Math.round(laborCost * 100) / 100,
        totalCost: Math.round(totalVariantCost * 100) / 100,
        metalComplexity: metalComplexity
      };
      
      relevantVariantLabels.push(variant.label);
    });
    
    // Fallback for "Universal" preview (e.g. if we just want a summary or simple view)
    // We calculate a generic "Yellow Gold 14k" or similar as base if available, else just labor
    const baseTotalCost = laborCost * 1.0; 

    return {
      isMetalDependent: true,
      metalPrices: metalPrices,
      relevantVariantLabels: relevantVariantLabels,
      summary: {
        baseHourlyRate: hourlyRate,
        laborHours: laborHours,
        laborCost: laborCost
      },
      // Keep flat structure populated with reasonable defaults for backward compatibility
      laborCost: Math.round(laborCost * 100) / 100,
      totalCost: Math.round(baseTotalCost * 100) / 100,
      hourlyRate: Math.round(hourlyRate * 100) / 100, 
      laborHours: laborHours,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Calculate material cost with markup
   * @param {Object} material - Material object
   * @param {number} quantity - Quantity of material
   * @param {Object} adminSettings - Admin settings
   * @returns {Object} Material cost breakdown
   * @throws {TypeError} If material is not an object or quantity is not a number
   * @throws {RangeError} If quantity is negative or zero
   */
  calculateMaterialCost(material, quantity = 1, adminSettings = {}) {
    // Guard clause: validate material parameter
    if (!material || typeof material !== 'object') {
      throw new TypeError(ERROR_MESSAGES.MATERIAL_MUST_BE_OBJECT);
    }
    
    // Guard clause: validate quantity parameter
    const parsedQuantity = parseFloat(quantity);
    if (isNaN(parsedQuantity)) {
      throw new TypeError(ERROR_MESSAGES.QUANTITY_MUST_BE_NUMBER);
    }
    if (parsedQuantity <= 0) {
      throw new RangeError(ERROR_MESSAGES.QUANTITY_MUST_BE_POSITIVE);
    }
    
    const settings = this._getNormalizedSettings(adminSettings);
    
    // Get base cost (from various possible fields)
    const baseCost = material.estimatedCost || 
                     material.costPerPortion || 
                     material.unitCost || 
                     material.stullerPrice || 
                     0;
    
    // Guard clause: validate base cost
    if (isNaN(baseCost)) {
      throw new TypeError(ERROR_MESSAGES.MATERIAL_COST_MUST_BE_NUMBER);
    }
    if (baseCost < 0) {
      throw new RangeError(ERROR_MESSAGES.MATERIAL_COST_CANNOT_BE_NEGATIVE);
    }
    
    // Apply material markup with minimum enforcement
    const materialMarkup = enforceMinimumMaterialMarkup(settings.materialMarkup);
    const markedUpCost = baseCost * materialMarkup;
    const totalCost = markedUpCost * parsedQuantity;
    
    return {
      baseCost: Math.round(baseCost * 100) / 100,
      markedUpCost: Math.round(markedUpCost * 100) / 100,
      materialMarkup: materialMarkup,
      quantity: parsedQuantity,
      totalCost: Math.round(totalCost * 100) / 100,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Apply business multiplier to base cost
   * @param {number} baseCost - Base cost before business multiplier
   * @param {Object} adminSettings - Admin settings
   * @returns {number} Cost with business multiplier applied
   * @throws {TypeError} If baseCost is not a number
   * @throws {RangeError} If baseCost is negative
   */
  applyBusinessMultiplier(baseCost, adminSettings = {}) {
    // Guard clause: validate baseCost parameter
    const parsedCost = parseFloat(baseCost);
    if (isNaN(parsedCost)) {
      throw new TypeError(ERROR_MESSAGES.BASE_COST_MUST_BE_NUMBER);
    }
    if (parsedCost < 0) {
      throw new RangeError(ERROR_MESSAGES.BASE_COST_CANNOT_BE_NEGATIVE);
    }
    
    // Early return for zero cost
    if (parsedCost === 0) {
      return 0;
    }
    
    const settings = this._getNormalizedSettings(adminSettings);
    
    // Calculate business multiplier
    const businessMultiplier = calculateBusinessMultiplier({
      administrativeFee: settings.administrativeFee,
      businessFee: settings.businessFee,
      consumablesFee: settings.consumablesFee
    });
    
    // Enforce minimum business multiplier
    const enforcedMultiplier = enforceMinimumBusinessMultiplier(businessMultiplier);
    
    return Math.round(parsedCost * enforcedMultiplier * 100) / 100;
  }

  /**
   * Calculate wholesale price
   * @param {number} retailPrice - Retail price
   * @param {number} baseCost - Base cost (before business multiplier)
   * @param {Object} adminSettings - Admin settings
   * @returns {number} Wholesale price
   * @throws {TypeError} If retailPrice or baseCost are not numbers
   * @throws {RangeError} If retailPrice or baseCost are negative
   * @throws {RangeError} If retailPrice is less than baseCost (invalid pricing)
   */
  calculateWholesalePrice(retailPrice, baseCost, adminSettings = {}) {
    // Guard clause: validate retailPrice parameter
    const parsedRetailPrice = parseFloat(retailPrice);
    if (isNaN(parsedRetailPrice)) {
      throw new TypeError(ERROR_MESSAGES.RETAIL_PRICE_MUST_BE_NUMBER);
    }
    if (parsedRetailPrice < 0) {
      throw new RangeError(ERROR_MESSAGES.RETAIL_PRICE_CANNOT_BE_NEGATIVE);
    }
    
    // Guard clause: validate baseCost parameter
    const parsedBaseCost = parseFloat(baseCost);
    if (isNaN(parsedBaseCost)) {
      throw new TypeError(ERROR_MESSAGES.BASE_COST_MUST_BE_NUMBER);
    }
    if (parsedBaseCost < 0) {
      throw new RangeError(ERROR_MESSAGES.BASE_COST_CANNOT_BE_NEGATIVE);
    }
    
    // Guard clause: validate pricing relationship
    if (parsedRetailPrice < parsedBaseCost) {
      throw new RangeError(ERROR_MESSAGES.RETAIL_PRICE_LESS_THAN_BASE_COST);
    }
    
    const settings = this._getNormalizedSettings(adminSettings);
    const wholesaleConfig = settings.wholesaleConfig || DEFAULT_WHOLESALE_CONFIG;
    
    let wholesalePrice;
    
    switch (wholesaleConfig.type) {
      case WHOLESALE_FORMULA_TYPE.PERCENTAGE_OF_RETAIL:
        // Simple percentage of retail
        wholesalePrice = parsedRetailPrice * (wholesaleConfig.percentage || 0.5);
        break;
        
      case WHOLESALE_FORMULA_TYPE.BUSINESS_MULTIPLIER_ADJUSTMENT:
        // Base cost * (business multiplier * adjustment)
        const businessMultiplier = calculateBusinessMultiplier({
          administrativeFee: settings.administrativeFee,
          businessFee: settings.businessFee,
          consumablesFee: settings.consumablesFee
        });
        wholesalePrice = parsedBaseCost * (businessMultiplier * (wholesaleConfig.adjustment || 0.75));
        break;
        
      case WHOLESALE_FORMULA_TYPE.FORMULA_BASED:
      default:
        // Formula: ((admin + business + consumables) / 2) + 1
        const adminFee = parsedBaseCost * settings.administrativeFee;
        const businessFee = parsedBaseCost * settings.businessFee;
        const consumablesFee = parsedBaseCost * settings.consumablesFee;
        wholesalePrice = ((adminFee + businessFee + consumablesFee) / 2) + parsedBaseCost;
        break;
    }
    
    // Enforce minimum wholesale multiplier
    const minimumWholesale = parsedBaseCost * enforceMinimumWholesaleMultiplier(1.0);
    wholesalePrice = Math.max(wholesalePrice, minimumWholesale);
    
    return Math.round(wholesalePrice * 100) / 100;
  }

  /**
   * Calculate task cost from processes and materials
   * Supports both new format (process.process) and legacy format (processId with availableProcesses)
   * @param {Object} taskData - Task data with processes and materials
   * @param {Object} adminSettings - Admin settings
   * @param {Array} availableProcesses - Optional: array of available processes (for legacy format)
   * @param {Array} availableMaterials - Optional: array of available materials (for legacy format)
   * @returns {Object} Task cost breakdown
   * @throws {TypeError} If taskData is not an object
   * @throws {TypeError} If availableProcesses or availableMaterials are not arrays
   */
  calculateTaskCost(taskData, adminSettings = {}, availableProcesses = [], availableMaterials = []) {
    // Guard clause: validate taskData parameter
    if (!taskData || typeof taskData !== 'object') {
      throw new TypeError(ERROR_MESSAGES.TASK_DATA_MUST_BE_OBJECT);
    }
    
    // Guard clause: validate availableProcesses parameter
    if (!Array.isArray(availableProcesses)) {
      throw new TypeError(ERROR_MESSAGES.AVAILABLE_PROCESSES_MUST_BE_ARRAY);
    }
    
    // Guard clause: validate availableMaterials parameter
    if (!Array.isArray(availableMaterials)) {
      throw new TypeError(ERROR_MESSAGES.AVAILABLE_MATERIALS_MUST_BE_ARRAY);
    }
    
    const settings = this._getNormalizedSettings(adminSettings);
    
    let totalLaborHours = 0;
    let totalProcessCost = 0;
    let totalMaterialCost = 0;
    
    // Calculate from processes
    if (taskData.processes && Array.isArray(taskData.processes)) {
      taskData.processes.forEach((processSelection, index) => {
        // Guard clause: validate process selection structure
        if (!processSelection || typeof processSelection !== 'object') {
          throw new TypeError(ERROR_MESSAGES.PROCESS_SELECTION_MUST_BE_OBJECT(index));
        }
        
        // Guard clause: validate quantity (check for 0 explicitly before defaulting)
        let quantity = processSelection.quantity;
        if (quantity === 0 || quantity === '0') {
          throw new RangeError(ERROR_MESSAGES.PROCESS_QUANTITY_MUST_BE_POSITIVE(index));
        }
        quantity = parseFloat(quantity) || 1;
        
        // Guard clause: validate parsed quantity
        if (isNaN(quantity) || quantity <= 0) {
          throw new RangeError(ERROR_MESSAGES.PROCESS_QUANTITY_MUST_BE_POSITIVE(index));
        }
        let process = processSelection.process || processSelection;
        
        // Legacy format: processId with availableProcesses lookup
        if (!process && processSelection.processId && availableProcesses.length > 0) {
          process = availableProcesses.find(p => 
            p._id?.toString() === processSelection.processId?.toString() ||
            p._id === processSelection.processId
          );
        }
        
        if (process) {
          // Use stored pricing if available (more accurate for metal-specific variants)
          if (process.pricing?.totalCost) {
            const storedCost = typeof process.pricing.totalCost === 'object' 
              ? Object.values(process.pricing.totalCost)[0] // Use first variant for universal
              : process.pricing.totalCost;
            totalProcessCost += storedCost * quantity;
            totalLaborHours += (process.laborHours || 0) * quantity;
            
            // Add stored material costs if available
            if (process.pricing.materialsCost) {
              const storedMaterialCost = typeof process.pricing.materialsCost === 'object'
                ? Object.values(process.pricing.materialsCost)[0]
                : process.pricing.materialsCost;
              totalMaterialCost += storedMaterialCost * quantity;
            }
          } else {
            // Calculate process cost dynamically
            const processCost = this.calculateProcessCost(process, adminSettings);
            
            // Add labor hours
            totalLaborHours += (process.laborHours || 0) * quantity;
            
            // Add process costs
            totalProcessCost += processCost.totalCost * quantity;
            
            // Add material costs from process
            totalMaterialCost += processCost.materialsCost * quantity;
          }
        }
      });
    }
    
    // Calculate from task-level materials
    if (taskData.materials && Array.isArray(taskData.materials)) {
      taskData.materials.forEach((materialSelection, index) => {
        // Guard clause: validate material selection structure
        if (!materialSelection || typeof materialSelection !== 'object') {
          throw new TypeError(ERROR_MESSAGES.MATERIAL_SELECTION_MUST_BE_OBJECT(index));
        }
        
        // Guard clause: validate quantity (check for 0 explicitly before defaulting)
        let quantity = materialSelection.quantity;
        if (quantity === 0 || quantity === '0') {
          throw new RangeError(ERROR_MESSAGES.MATERIAL_QUANTITY_MUST_BE_POSITIVE(index));
        }
        quantity = parseFloat(quantity) || 1;
        
        // Guard clause: validate parsed quantity
        if (isNaN(quantity) || quantity <= 0) {
          throw new RangeError(ERROR_MESSAGES.MATERIAL_QUANTITY_MUST_BE_POSITIVE(index));
        }
        let material = materialSelection.material || materialSelection;
        
        // Legacy format: materialId with availableMaterials lookup
        if (!material && materialSelection.materialId && availableMaterials.length > 0) {
          material = availableMaterials.find(m => 
            m._id?.toString() === materialSelection.materialId?.toString() ||
            m._id === materialSelection.materialId ||
            m.sku === materialSelection.materialSku
          );
        }
        
        if (material) {
          // Use unitCost if available (may already include markup), otherwise calculate
          if (material.unitCost && material.unitCost > 0) {
            totalMaterialCost += material.unitCost * quantity;
          } else {
            const materialCost = this.calculateMaterialCost(material, quantity, adminSettings);
            totalMaterialCost += materialCost.totalCost;
          }
        }
      });
    }
    
    // Apply material markup to task materials (if not already marked up)
    // Note: Process materials are already marked up in calculateProcessCost
    const materialMarkup = enforceMinimumMaterialMarkup(settings.materialMarkup);
    const markedUpMaterialCost = totalMaterialCost * materialMarkup;
    
    // Calculate base cost
    const baseCost = totalProcessCost + markedUpMaterialCost;
    
    // Apply business multiplier
    const retailPrice = this.applyBusinessMultiplier(baseCost, adminSettings);
    
    // Calculate wholesale price
    const wholesalePrice = this.calculateWholesalePrice(retailPrice, baseCost, adminSettings);
    
    return {
      totalLaborHours: Math.round(totalLaborHours * 100) / 100,
      totalProcessCost: Math.round(totalProcessCost * 100) / 100,
      totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
      markedUpMaterialCost: Math.round(markedUpMaterialCost * 100) / 100,
      baseCost: Math.round(baseCost * 100) / 100,
      retailPrice: retailPrice,
      wholesalePrice: wholesalePrice,
      businessMultiplier: this.getBusinessMultiplier(adminSettings),
      materialMarkup: materialMarkup,
      calculatedAt: new Date().toISOString()
    };
  }

  /**
   * Calculate labor cost directly
   * @param {number} laborHours - Labor hours
   * @param {string} skillLevel - Skill level (optional, defaults to DEFAULT_SKILL_LEVEL, must be one of VALID_SKILL_LEVELS)
   * @param {Object} adminSettings - Admin settings
   * @returns {number} Labor cost
   * @throws {TypeError} If laborHours is not a number or skillLevel is not valid
   * @throws {RangeError} If laborHours is negative
   */
  calculateLaborCost(laborHours, skillLevel = DEFAULT_SKILL_LEVEL, adminSettings = {}) {
    // Guard clause: validate laborHours parameter
    const parsedHours = parseFloat(laborHours);
    if (isNaN(parsedHours)) {
      throw new TypeError(ERROR_MESSAGES.LABOR_HOURS_MUST_BE_NUMBER);
    }
    if (parsedHours < 0) {
      throw new RangeError(ERROR_MESSAGES.LABOR_HOURS_CANNOT_BE_NEGATIVE);
    }
    
    // Guard clause: validate skillLevel parameter using constants
    if (skillLevel !== undefined && !isValidSkillLevel(skillLevel)) {
      throw new TypeError(`${ERROR_MESSAGES.SKILL_LEVEL_MUST_BE_STRING}. Valid values: ${VALID_SKILL_LEVELS.join(', ')}`);
    }
    
    const hourlyRate = this.getHourlyRateForSkill(skillLevel, adminSettings);
    return Math.round((parsedHours * hourlyRate) * 100) / 100;
  }

  /**
   * Get hourly rate for skill level
   * @param {string} skillLevel - Skill level (must be one of VALID_SKILL_LEVELS)
   * @param {Object} adminSettings - Admin settings
   * @returns {number} Hourly rate
   * @throws {TypeError} If skillLevel is not a valid skill level
   */
  getHourlyRateForSkill(skillLevel, adminSettings = {}) {
    // Guard clause: validate skillLevel parameter using constants
    if (skillLevel !== undefined && !isValidSkillLevel(skillLevel)) {
      throw new TypeError(`${ERROR_MESSAGES.SKILL_LEVEL_MUST_BE_STRING}. Valid values: ${VALID_SKILL_LEVELS.join(', ')}`);
    }
    
    const settings = this._getNormalizedSettings(adminSettings);
    return calculateHourlyRateForSkill(settings.baseWage, skillLevel);
  }

  /**
   * Get business multiplier
   * @param {Object} adminSettings - Admin settings
   * @returns {number} Business multiplier
   */
  getBusinessMultiplier(adminSettings = {}) {
    const settings = this._getNormalizedSettings(adminSettings);
    const multiplier = calculateBusinessMultiplier({
      administrativeFee: settings.administrativeFee,
      businessFee: settings.businessFee,
      consumablesFee: settings.consumablesFee
    });
    return enforceMinimumBusinessMultiplier(multiplier);
  }
}

// Export singleton instance
const pricingEngine = new PricingEngine();

export default pricingEngine;
export { PricingEngine };

