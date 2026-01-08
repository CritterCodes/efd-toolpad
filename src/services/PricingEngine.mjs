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
} from '../constants/pricing.constants.mjs';

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
    const laborCost = laborHours * hourlyRate;
    
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
      throw new TypeError('Base cost must be a valid number');
    }
    if (parsedCost < 0) {
      throw new RangeError('Base cost cannot be negative');
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
   * Get hourly rate for skill level
   * @param {string} skillLevel - Skill level (must be one of VALID_SKILL_LEVELS)
   * @param {Object} adminSettings - Admin settings
   * @returns {number} Hourly rate
   * @throws {TypeError} If skillLevel is not a valid skill level
   */
  getHourlyRateForSkill(skillLevel, adminSettings = {}) {
    // Guard clause: validate skillLevel parameter using constants
    // If skillLevel is undefined, use default (will be handled by calculateHourlyRateForSkill)
    if (skillLevel !== undefined && !isValidSkillLevel(skillLevel)) {
      throw new TypeError(`${ERROR_MESSAGES.SKILL_LEVEL_MUST_BE_STRING}. Valid values: ${VALID_SKILL_LEVELS.join(', ')}`);
    }
    
    const settings = this._getNormalizedSettings(adminSettings);
    // Use default if skillLevel is undefined
    const effectiveSkillLevel = skillLevel || DEFAULT_SKILL_LEVEL;
    return calculateHourlyRateForSkill(settings.baseWage, effectiveSkillLevel);
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

  /**
   * Calculate labor cost directly
   * @param {number} laborHours - Labor hours
   * @param {string} skillLevel - Skill level (optional, defaults to DEFAULT_SKILL_LEVEL)
   * @param {Object} adminSettings - Admin settings
   * @returns {number} Labor cost
   * @throws {TypeError} If laborHours is not a number
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
}

// Export singleton instance
const pricingEngine = new PricingEngine();

export default pricingEngine;
export { PricingEngine };

