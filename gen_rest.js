const fs = require('fs');

fs.writeFileSync('src/services/pricing/process.pricing.js', `import { DEFAULT_SKILL_LEVEL, ERROR_MESSAGES, getSkillLevelMultiplier, enforceMinimumMaterialMarkup, isValidSkillLevel } from '@/constants/pricing.constants.mjs';
import { getNormalizedSettings, getBusinessMultiplierValue } from './config.pricing.js';\nimport { getMaterialBaseRawCost } from './material.pricing.js';\nimport { calculateLaborCost, getHourlyRateForSkill } from './labor.pricing.js';\nimport { calculateBusinessMultiplier, enforceMinimumBusinessMultiplier } from '@/constants/pricing.constants.mjs';

export function calculateProcessCost(process, adminSettings = {}) {
  if (!process || typeof process !== 'object') throw new TypeError(ERROR_MESSAGES.PROCESS_MUST_BE_OBJECT);
  const settings = getNormalizedSettings(adminSettings);
  const laborHours = parseFloat(process.laborHours) || 0;
  if (laborHours < 0) throw new RangeError(ERROR_MESSAGES.LABOR_HOURS_CANNOT_BE_NEGATIVE);
  const skillLevel = isValidSkillLevel(process.skillLevel) ? process.skillLevel : DEFAULT_SKILL_LEVEL;
  const hourlyRate = getHourlyRateForSkill(skillLevel, adminSettings);
  const laborCost = laborHours * hourlyRate;
  const materialMarkup = enforceMinimumMaterialMarkup(settings.materialMarkup);
  const materials = Array.isArray(process.materials) ? process.materials : [];
  const isMetalDependent = materials.some(m => m.isMetalDependent);
  if (isMetalDependent) return _calculateMetalDependentProcessCost(process, settings, laborCost, hourlyRate, skillLevel, laborHours, materialMarkup);
  let baseMaterialsCost = 0; let oldMarkedUpMaterialsCost = 0;
  materials.forEach(material => {
    const quantity = parseFloat(material.quantity) || 1;
    let cost = getMaterialBaseRawCost(material);
    if (material.costPerPortion) { cost = material.costPerPortion; }
    else if (material.unit === 'portion' && material.portionsPerUnit > 1) {
       if (!material.estimatedCost) { const rawUnit = material.unitCost || 0; cost = rawUnit / material.portionsPerUnit; }
    }
    baseMaterialsCost += cost * quantity; oldMarkedUpMaterialsCost += (cost * materialMarkup) * quantity;
  });
  const businessMultiplier = getBusinessMultiplierValue(adminSettings);
  const metalComplexityMultiplier = 1.0;
  const weightedLaborCost = laborCost * metalComplexityMultiplier;
  const weightedBaseMaterialsCost = baseMaterialsCost * metalComplexityMultiplier;
  const retailPrice = weightedLaborCost + weightedBaseMaterialsCost;
  return { laborCost: Math.round(laborCost * 100) / 100, baseMaterialsCost: Math.round(baseMaterialsCost * 100) / 100, materialsCost: Math.round(oldMarkedUpMaterialsCost * 100) / 100, materialMarkup: materialMarkup, weightedLaborCost: weightedLaborCost, weightedBaseMaterialsCost: weightedBaseMaterialsCost, metalComplexityMultiplier: metalComplexityMultiplier, totalCost: Math.round(retailPrice * 100) / 100, retailPrice: Math.round(retailPrice * 100) / 100, hourlyRate: Math.round(hourlyRate * 100) / 100, skillMultiplier: getSkillLevelMultiplier(skillLevel), laborHours: laborHours, calculatedAt: new Date().toISOString(), isMetalDependent: false };
}

function _calculateMetalDependentProcessCost(process, settings, laborCost, hourlyRate, skillLevel, laborHours, materialMarkup) {
  const bizMul = calculateBusinessMultiplier({ administrativeFee: settings.administrativeFee, businessFee: settings.businessFee, consumablesFee: settings.consumablesFee });
  const enforcedBizMul = enforceMinimumBusinessMultiplier(bizMul);
  const metalPrices = {}; const materials = process.materials || [];
  const foundVariants = new Set(); const variantMap = new Map();
  materials.forEach(material => {
    if (material.isMetalDependent && Array.isArray(material.stullerProducts)) {
      material.stullerProducts.forEach(prod => {
        if (!prod.metalType || !prod.karat) return;
        const key = \`\${prod.metalType}_\${prod.karat}\`.toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (!foundVariants.has(key)) {
          foundVariants.add(key);
          const metalLabel = prod.metalType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          const label = \`\${metalLabel} \${prod.karat.toUpperCase()}\`;
          variantMap.set(key, { metalType: prod.metalType, karat: prod.karat, label, key });
        }
      });
    }
  });
  const relevantVariantLabels = []; const universalMaterials = materials.filter(m => !m.isMetalDependent);
  variantMap.forEach((variant, variantKey) => {
    let variantTotalMaterialsCost = 0; const materialBreakdown = [];
    universalMaterials.forEach(m => {
      const cost = (m.estimatedCost || 0) * materialMarkup; variantTotalMaterialsCost += cost;
      materialBreakdown.push({ name: m.displayName || m.name, quantity: m.quantity || 1, unitPrice: cost / (m.quantity || 1), total: cost });
    });
    materials.filter(m => m.isMetalDependent).forEach(m => {
      const product = (m.stullerProducts || []).find(p => p.metalType === variant.metalType && p.karat === variant.karat);
      let cost = 0; let unitPrice = 0;
      if (product) {
        let rawCost = getMaterialBaseRawCost(null, product);
        let basePrice = product.costPerPortion;
        if (basePrice === undefined) { const portions = m.portionsPerUnit || 1; basePrice = (rawCost > 0 ? rawCost : (product.unitCost || 0)) / portions; }
        const markedUp = basePrice; const quantity = parseFloat(m.quantity) || 1;
        cost = markedUp * quantity; unitPrice = markedUp;
      }
      variantTotalMaterialsCost += cost;
      materialBreakdown.push({ name: m.displayName || m.name, quantity: m.quantity || 1, unitPrice: unitPrice, total: cost, isVariant: true, found: !!product });
    });
    const metalComplexity = 1.0; let variantBaseMaterialsCost = 0;
    universalMaterials.forEach(m => { variantBaseMaterialsCost += (m.estimatedCost || 0); });
    materials.filter(m => m.isMetalDependent).forEach(m => {
      const product = (m.stullerProducts || []).find(p => p.metalType === variant.metalType && p.karat === variant.karat);
       if (product) {
        let rawCost = getMaterialBaseRawCost(null, product);
        let basePrice = product.costPerPortion;
        if (basePrice === undefined && rawCost > 0) { const portions = m.portionsPerUnit || 1; basePrice = rawCost / portions; }
        else if (basePrice === undefined) { basePrice = 0; }
        const quantity = parseFloat(m.quantity) || 1; variantBaseMaterialsCost += basePrice * quantity;
      }
    });
    const weightedBaseMaterials = variantBaseMaterialsCost * metalComplexity;
    const weightedLabor = laborCost * metalComplexity;
    const totalVariantRetail = weightedBaseMaterials + weightedLabor;
    metalPrices[variantKey] = { metalLabel: variant.label, materialsCost: Math.round(variantBaseMaterialsCost * 100) / 100, baseMaterialsCost: Math.round(variantBaseMaterialsCost * 100) / 100, materialBreakdown: materialBreakdown, laborCost: Math.round(laborCost * 100) / 100, totalCost: Math.round(totalVariantRetail * 100) / 100, retailPrice: Math.round(totalVariantRetail * 100) / 100, metalComplexity: metalComplexity, weightedBaseMaterialsCost: weightedBaseMaterials, weightedLaborCost: weightedLabor };
    relevantVariantLabels.push(variant.label);
  });
  const baseTotalCost = laborCost; 
  return { isMetalDependent: true, metalPrices: metalPrices, relevantVariantLabels: relevantVariantLabels, summary: { baseHourlyRate: hourlyRate, laborHours: laborHours, laborCost: laborCost }, laborCost: Math.round(laborCost * 100) / 100, totalCost: Math.round(baseTotalCost * 100) / 100, hourlyRate: Math.round(hourlyRate * 100) / 100, laborHours: laborHours, calculatedAt: new Date().toISOString() };
}`);

fs.writeFileSync('src/services/pricing/task.pricing.js', `import { ERROR_MESSAGES, enforceMinimumMaterialMarkup } from '@/constants/pricing.constants.mjs';\nimport { getNormalizedSettings, getBusinessMultiplierValue } from './config.pricing.js';\nimport { calculateProcessCost } from './process.pricing.js';\nimport { calculateMaterialCost } from './material.pricing.js';\nimport { calculateWholesalePrice } from './business.pricing.js';\n\nexport function calculateTaskCost(taskData, adminSettings = {}, availableProcesses = [], availableMaterials = [], context = null) {
  if (!taskData || typeof taskData !== 'object') throw new TypeError(ERROR_MESSAGES.TASK_DATA_MUST_BE_OBJECT);
  if (!Array.isArray(availableProcesses)) throw new TypeError(ERROR_MESSAGES.AVAILABLE_PROCESSES_MUST_BE_ARRAY);
  if (!Array.isArray(availableMaterials)) throw new TypeError(ERROR_MESSAGES.AVAILABLE_MATERIALS_MUST_BE_ARRAY);
  const settings = getNormalizedSettings(adminSettings);
  let contextKey = null;
  if (context) { if (typeof context === 'string') { contextKey = context; } else if (context.metalType && context.karat) { contextKey = \`\${context.metalType}_\${context.karat}\`.toLowerCase().replace(/[^a-z0-9]/g, '_'); } }
  let totalLaborHours = 0; let totalProcessCost = 0; let totalMaterialCost = 0; let totalWeightedLaborCost = 0; let totalWeightedBaseMaterialsCost = 0;
  if (taskData.processes && Array.isArray(taskData.processes)) {
    taskData.processes.forEach((processSelection, index) => {
      let quantity = parseFloat(processSelection.quantity || 1);
      let process = processSelection.process || processSelection;
      if (!process && processSelection.processId && availableProcesses.length > 0) { process = availableProcesses.find(p => p._id === processSelection.processId); }
      if (process) {
        const processCost = calculateProcessCost(process, adminSettings);
        let weightedLabor = 0; let weightedMaterials = 0; let currentTotalCost = 0;
        if (contextKey && processCost.isMetalDependent && processCost.metalPrices && processCost.metalPrices[contextKey]) {
            const variantPricing = processCost.metalPrices[contextKey];
            weightedLabor = variantPricing.weightedLaborCost; weightedMaterials = variantPricing.weightedBaseMaterialsCost; currentTotalCost = variantPricing.totalCost;
        } else {
            const complexity = processCost.metalComplexityMultiplier || 1;
            const pLabor = processCost.laborCost || 0; const pBaseMat = processCost.baseMaterialsCost || 0;
            weightedLabor = processCost.weightedLaborCost || (pLabor * complexity); weightedMaterials = processCost.weightedBaseMaterialsCost || (pBaseMat * complexity); currentTotalCost = processCost.totalCost || 0;
        }
        totalWeightedLaborCost += weightedLabor * quantity; totalWeightedBaseMaterialsCost += weightedMaterials * quantity; totalLaborHours += (process.laborHours || 0) * quantity; totalProcessCost += currentTotalCost * quantity; 
      }
    });
  }
  if (taskData.materials && Array.isArray(taskData.materials)) {
    taskData.materials.forEach((materialSelection, index) => {
      let quantity = parseFloat(materialSelection.quantity || 1);
      let material = materialSelection.material || materialSelection;
      if (material) { const matCost = calculateMaterialCost(material, quantity, adminSettings); const totalBase = matCost.baseCost * quantity; totalWeightedBaseMaterialsCost += totalBase; totalMaterialCost += matCost.totalCost; }
    });
  }
  const businessMultiplier = getBusinessMultiplierValue(adminSettings);
  const materialMarkup = enforceMinimumMaterialMarkup(settings.materialMarkup);
  const term1 = (totalWeightedBaseMaterialsCost + totalWeightedLaborCost) * businessMultiplier;
  const term2 = totalWeightedBaseMaterialsCost * (materialMarkup - 1);
  const retailPrice = term1 + term2;
  const wholesalePrice = calculateWholesalePrice(retailPrice, (totalWeightedBaseMaterialsCost + totalWeightedLaborCost), adminSettings);
  return { totalLaborHours: Math.round(totalLaborHours * 100) / 100, totalProcessCost: Math.round(totalProcessCost * 100) / 100, totalMaterialCost: Math.round(totalMaterialCost * 100) / 100, baseCost: Math.round((totalWeightedBaseMaterialsCost + totalWeightedLaborCost) * 100) / 100, retailPrice: Math.round(retailPrice * 100) / 100, wholesalePrice: wholesalePrice, businessMultiplier: businessMultiplier, materialMarkup: materialMarkup, calculatedAt: new Date().toISOString() };
}`);

fs.writeFileSync('src/services/PricingEngine.js', `/**
 * Pricing Engine - Centralized Pricing Calculation Service
 * 
 * Single source of truth for all pricing calculations following SOLID principles.
 * All job costing logic should use this service instead of scattered utility functions.
 * 
 * @module PricingEngine
 */

import { getNormalizedSettings, getBusinessMultiplierValue } from './pricing/config.pricing.js';
import { getMaterialBaseRawCost, calculateMaterialCost } from './pricing/material.pricing.js';
import { calculateLaborCost, getHourlyRateForSkill } from './pricing/labor.pricing.js';
import { calculateProcessCost } from './pricing/process.pricing.js';
import { applyBusinessMultiplier, calculateWholesalePrice } from './pricing/business.pricing.js';
import { calculateTaskCost } from './pricing/task.pricing.js';
import { DEFAULT_SKILL_LEVEL } from '@/constants/pricing.constants.mjs';

class PricingEngine {
  _getNormalizedSettings(adminSettings = {}) { return getNormalizedSettings(adminSettings); }
  _getMaterialBaseRawCost(material, stullerProduct = null) { return getMaterialBaseRawCost(material, stullerProduct); }
  calculateProcessCost(process, adminSettings = {}) { return calculateProcessCost(process, adminSettings); }
  calculateMaterialCost(material, quantity = 1, adminSettings = {}) { return calculateMaterialCost(material, quantity, adminSettings); }
  applyBusinessMultiplier(baseCost, adminSettings = {}) { return applyBusinessMultiplier(baseCost, adminSettings); }
  calculateWholesalePrice(retailPrice, baseCost, adminSettings = {}) { return calculateWholesalePrice(retailPrice, baseCost, adminSettings); }
  calculateTaskCost(taskData, adminSettings = {}, availableProcesses = [], availableMaterials = [], context = null) { return calculateTaskCost(taskData, adminSettings, availableProcesses, availableMaterials, context); }
  calculateLaborCost(laborHours, skillLevel = DEFAULT_SKILL_LEVEL, adminSettings = {}) { return calculateLaborCost(laborHours, skillLevel, adminSettings); }
  getHourlyRateForSkill(skillLevel, adminSettings = {}) { return getHourlyRateForSkill(skillLevel, adminSettings); }
  getBusinessMultiplier(adminSettings = {}) { return getBusinessMultiplierValue(adminSettings); }
}

const pricingEngine = new PricingEngine();
export default pricingEngine;
export { PricingEngine };
`);
