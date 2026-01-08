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
   * Helper to strip away DB-stored markups and find the true RAW vendor cost per unit/portion.
   * This enforces the logic that meaningful pricing happens at runtime, not in the DB.
   */
  _getMaterialBaseRawCost(material, stullerProduct = null) {
    // 1. If we have a specific Stuller Variant, that matches a specific vendor price
    if (stullerProduct) {
      if (stullerProduct.stullerPrice && stullerProduct.stullerPrice > 0) {
        return stullerProduct.stullerPrice;
      }
      // Fallback: If stullerPrice is missing but unitCost exists, we hope it's raw.
      // But given the issue, it likely ISN'T. We'll trust it only if stullerPrice is empty.
      return stullerProduct.unitCost || 0;
    }

    // 2. Generic Material
    // 'estimatedCost' is the convention for "What does this cost me?"
    if (material.estimatedCost && material.estimatedCost > 0) {
      return material.estimatedCost;
    }
    
    // 3. Last resort - use unitCost but it might be "polluted" with markup depending on legacy saves
    return material.unitCost || 0;
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
    
    // 1. Calculate Labor
    const laborHours = parseFloat(process.laborHours) || 0;
    if (laborHours < 0) {
      throw new RangeError(ERROR_MESSAGES.LABOR_HOURS_CANNOT_BE_NEGATIVE);
    }
    
    const skillLevel = isValidSkillLevel(process.skillLevel) ? process.skillLevel : DEFAULT_SKILL_LEVEL;
    const hourlyRate = calculateHourlyRateForSkill(settings.baseWage, skillLevel);
    const laborCost = laborHours * hourlyRate;
    
    // 2. Material Markup & Business Multiplier
    const materialMarkup = enforceMinimumMaterialMarkup(settings.materialMarkup);

    // 3. Check Metal Dependency
    const materials = Array.isArray(process.materials) ? process.materials : [];
    const isMetalDependent = materials.some(m => m.isMetalDependent);
    
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
    
    // 4. Universal Calculation
    let baseMaterialsCost = 0;
    let oldMarkedUpMaterialsCost = 0; // Track legacy calculation for comparison if needed

    materials.forEach(material => {
      const quantity = parseFloat(material.quantity) || 1;
      
      // NEW: Use base raw cost helper. 
      // This ignores unitCost if estimatedCost or costPerPortion is better.
      // But for universal materials, we usually have 'estimatedCost' (full) or 'costPerPortion' (if using portions)
      // If we are using portions, we must divide if only unit cost is known.
      
      let cost = this._getMaterialBaseRawCost(material);
      
      // Handle Portion Math - if unit is 'portion' but cost is 'unit', divide.
      // But _getMaterialBaseRawCost just gets A number.
      // If costPerPortion is set, that's preferred.
      
      if (material.costPerPortion) {
         cost = material.costPerPortion;
      } else if (material.unit === 'portion' && material.portionsPerUnit > 1) {
         // If cost looks like a full unit price, split it.
         // But how do we know if 'cost' returned above is unit or portion?
         // Convention: estimatedCost is usually Portion Cost if entered manually, but unitCost is Unit Cost.
         // Let's rely on costPerPortion. If missing, and we have portionsPerUnit, divide unitCost.
         
         if (!material.estimatedCost) { // If manual cost set, trust it.
            const rawUnit = material.unitCost || 0;
            cost = rawUnit / material.portionsPerUnit;
         }
      }

      baseMaterialsCost += cost * quantity;
      oldMarkedUpMaterialsCost += (cost * materialMarkup) * quantity;
    });

    // Calculate final retail price components
    const businessMultiplier = this.getBusinessMultiplier(adminSettings);
    
    // Formula: ((MaterialsBase + Labor) * BusinessMultiplier) + (MaterialsBase * (MaterialMarkup - 1))
    // We apply MetalComplexity (1.0 for universal) to the components first
    const metalComplexityMultiplier = 1.0;
    
    const weightedLaborCost = laborCost * metalComplexityMultiplier;
    const weightedBaseMaterialsCost = baseMaterialsCost * metalComplexityMultiplier;
    
    // UPDATED REQUIREMENT: Process Cost is essentially COG (Labor + Material).
    // Markups are applied at the Task level or higher.
    // So for Process level, we return the raw COG.
    
    // const term1 = (weightedLaborCost + weightedBaseMaterialsCost) * businessMultiplier;
    // const term2 = weightedBaseMaterialsCost * (materialMarkup - 1);
    // const retailPrice = term1 + term2;
    
    const retailPrice = weightedLaborCost + weightedBaseMaterialsCost;
    
    return {
      laborCost: Math.round(laborCost * 100) / 100,
      baseMaterialsCost: Math.round(baseMaterialsCost * 100) / 100,
      materialsCost: Math.round(oldMarkedUpMaterialsCost * 100) / 100, // Legacy field: marked up materials
      materialMarkup: materialMarkup,
      
      // Cost components weighted by complexity (for task aggregation)
      weightedLaborCost: weightedLaborCost,
      weightedBaseMaterialsCost: weightedBaseMaterialsCost,
      metalComplexityMultiplier: metalComplexityMultiplier,
      
      // Final Retail Price (formerly totalCost, now including BizMul)
      totalCost: Math.round(retailPrice * 100) / 100,
      retailPrice: Math.round(retailPrice * 100) / 100,
      
      hourlyRate: Math.round(hourlyRate * 100) / 100,
      skillMultiplier: getSkillLevelMultiplier(skillLevel),
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
    const businessMultiplier = this.getBusinessMultiplier({ pricing: settings }); // settings is normalized already? No, getBusinessMultiplier expects adminSettings object or re-normalizes.
    // _calculateMetalDependentProcessCost settings param comes from calculateProcessCost which called _getNormalizedSettings
    // So 'settings' here IS normalized.
    // But getBusinessMultiplier calls _getNormalizedSettings internally on its input.
    // So passing normalized settings as { pricing: settings } might work if structure matches, OR we calculate multiplier directly.
    const bizMul = calculateBusinessMultiplier({
      administrativeFee: settings.administrativeFee,
      businessFee: settings.businessFee,
      consumablesFee: settings.consumablesFee
    });
    const enforcedBizMul = enforceMinimumBusinessMultiplier(bizMul);

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
          // unitCost is usually user-facing cost (purchase price of item), but we need cost basis for the PORTION.
          // In ProcessForm construction, portionsPerUnit is set.
          
          // Check if product has costPerPortion (migrated) or unitCost (raw)
          let basePrice = product.costPerPortion;
          
          if (basePrice === undefined) {
             const unitCost = product.unitCost || product.stullerPrice || 0;
             const portions = m.portionsPerUnit || 1;
             basePrice = unitCost / portions;
          }

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
      // DEPRECATED: Metal complexity is no longer used for pricing.
      const metalComplexity = 1.0;
      
      // Calculate retail price for variant using new formula
      const weightedLabor = laborCost * metalComplexity;
      const weightedMaterials = variantTotalMaterialsCost * metalComplexity; // variantTotalMaterialsCost IS Base Cost here?
      // Wait, in step 1 & 2 above, we calculated variantTotalMaterialsCost.
      // step 1: cost = (m.estimatedCost || 0) * materialMarkup; -> This is MARKED UP cost.
      // step 2: markedUp = basePrice * materialMarkup; -> This is MARKED UP cost.
      
      // We need BASE cost for the formula.
      // Let's re-calculate base cost sum.
      
      let variantBaseMaterialsCost = 0;
       // 1. Universal Base
      universalMaterials.forEach(m => {
        variantBaseMaterialsCost += (m.estimatedCost || 0);
      });
      // 2. Dependent Base
      materials.filter(m => m.isMetalDependent).forEach(m => {
        const product = (m.stullerProducts || []).find(p => 
          p.metalType === variant.metalType && 
          p.karat === variant.karat
        );
         if (product) {
          // NEW: Use helper to find raw cost
          let rawCost = this._getMaterialBaseRawCost(null, product); // Pass product as stullerProduct
          
          let basePrice = product.costPerPortion;
          if (basePrice === undefined && rawCost > 0) {
             const portions = m.portionsPerUnit || 1;
             basePrice = rawCost / portions;
          } else if (basePrice === undefined) {
             // Fallback if rawCost is zero?
             basePrice = 0;
          }
          
          const quantity = parseFloat(m.quantity) || 1;
          variantBaseMaterialsCost += basePrice * quantity;
        }
      });
      
      const weightedBaseMaterials = variantBaseMaterialsCost * metalComplexity;
      
      // Formula: ((M_base + L) * Biz) + (M_base * (Mk - 1))
      // With complex: ((weightedBaseMat + weightedLabor) * Biz) + (weightedBaseMat * (Mk - 1))
      
      // UPDATED REQUIREMENT: Process Cost is essentially COG.
      // const term1_v = (weightedBaseMaterials + weightedLabor) * enforcedBizMul;
      // const term2_v = weightedBaseMaterials * (materialMarkup - 1);
      // const totalVariantRetail = term1_v + term2_v;
      
      const totalVariantRetail = weightedBaseMaterials + weightedLabor;
      
      metalPrices[variantKey] = {
        metalLabel: variant.label,
        materialsCost: Math.round((variantBaseMaterialsCost * materialMarkup) * 100) / 100, // Show marked up cost as "Materials Cost" legacy
        baseMaterialsCost: Math.round(variantBaseMaterialsCost * 100) / 100,
        materialBreakdown: materialBreakdown,
        laborCost: Math.round(laborCost * 100) / 100,
        totalCost: Math.round(totalVariantRetail * 100) / 100, // This is RETAIL now
        retailPrice: Math.round(totalVariantRetail * 100) / 100,
        metalComplexity: metalComplexity,
        weightedBaseMaterialsCost: weightedBaseMaterials,
        weightedLaborCost: weightedLabor
      };
      
      relevantVariantLabels.push(variant.label);
    });
    
    // Fallback for "Universal" preview (e.g. if we just want a summary or simple view)
    // UPDATED REQUIREMENT: Process Cost is essentially COG. Remove markup.
    const baseTotalCost = laborCost; 

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
    let totalWeightedLaborCost = 0;
    let totalWeightedBaseMaterialsCost = 0;
    
    // Calculate from processes
    if (taskData.processes && Array.isArray(taskData.processes)) {
      taskData.processes.forEach((processSelection, index) => {
        // ... validation logic omitted for brevity ...
        let quantity = parseFloat(processSelection.quantity || 1);
        
        let process = processSelection.process || processSelection;
        if (!process && processSelection.processId && availableProcesses.length > 0) {
          process = availableProcesses.find(p => p._id === processSelection.processId);
        }
        
        if (process) {
          // Calculate dynamic cost if not stored
          // Even if stored, we generally prefer fresh calculation for Admin tool, 
          // unless this is a locked historic quote.
          const processCost = this.calculateProcessCost(process, adminSettings);
            
          // Aggregate weighted components
          // If we had stored cost, we'd need to assume it.
          // For now, assume dynamic.
            
          let weightedLabor = processCost.weightedLaborCost || (processCost.laborCost * (processCost.metalComplexityMultiplier || 1));
          let weightedMaterials = processCost.weightedBaseMaterialsCost || (processCost.baseMaterialsCost * (processCost.metalComplexityMultiplier || 1));
            
          totalWeightedLaborCost += weightedLabor * quantity;
          totalWeightedBaseMaterialsCost += weightedMaterials * quantity;
            
          totalLaborHours += (process.laborHours || 0) * quantity;
          
          // Also track raw costs for reference if needed
          totalProcessCost += processCost.totalCost * quantity; // This is now retail
        }
      });
    }
    
    // Calculate from task-level materials (assume Complexity 1.0 for loose materials or apply one?)
    // Usually task-level materials are things like "extra gold", which might follow metal complexity.
    // For now, assume complexity 1.0 for loose materials unless specified.
    
    if (taskData.materials && Array.isArray(taskData.materials)) {
      taskData.materials.forEach((materialSelection, index) => {
        let quantity = parseFloat(materialSelection.quantity || 1);
        let material = materialSelection.material || materialSelection;
        
        if (material) {
             const matCost = this.calculateMaterialCost(material, quantity, adminSettings);
             // matCost.baseCost is unit base cost.
             // matCost.totalCost is marked up.
             
             // We need Total Base Cost for quantity
             const totalBase = matCost.baseCost * quantity;
             totalWeightedBaseMaterialsCost += totalBase; // Complexity 1.0
             
             totalMaterialCost += matCost.totalCost; // For reference
        }
      });
    }
    
    // Final Calculation using User Formula
    // Retail = ((MaterialsBase + Labor) * BusinessMultiplier) + (MaterialsBase * (MaterialMarkup - 1))
    
    // settings already normalized above
    const businessMultiplier = this.getBusinessMultiplier(adminSettings);
    const materialMarkup = enforceMinimumMaterialMarkup(settings.materialMarkup);
    
    const term1 = (totalWeightedBaseMaterialsCost + totalWeightedLaborCost) * businessMultiplier;
    const term2 = totalWeightedBaseMaterialsCost * (materialMarkup - 1);
    
    const retailPrice = term1 + term2;
    
    // Calculate wholesale similarly
    const wholesalePrice = this.calculateWholesalePrice(retailPrice, (totalWeightedBaseMaterialsCost + totalWeightedLaborCost), adminSettings);
    
    return {
      totalLaborHours: Math.round(totalLaborHours * 100) / 100,
      totalProcessCost: Math.round(totalProcessCost * 100) / 100, // Sum of individual retail prices
      totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
      
      baseCost: Math.round((totalWeightedBaseMaterialsCost + totalWeightedLaborCost) * 100) / 100,
      
      retailPrice: Math.round(retailPrice * 100) / 100,
      wholesalePrice: wholesalePrice,
      businessMultiplier: businessMultiplier,
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

