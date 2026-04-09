import { ERROR_MESSAGES, enforceMinimumMaterialMarkup } from '@/constants/pricing.constants.mjs';
import { getNormalizedSettings, getBusinessMultiplierValue } from './config.pricing.js';
import { calculateProcessCost } from './process.pricing.js';
import { calculateMaterialCost } from './material.pricing.js';
import { calculateWholesalePrice } from './business.pricing.js';

function normalizePositiveNumber(value) {
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}
const TASK_ROUNDING_INCREMENT = 5;

function roundToNearestIncrement(value, increment) {
  if (!increment || value <= 0) {
    return value;
  }

  return Math.round(value / increment) * increment;
}

function getVariantRetailMultiplier(taskData, contextKey) {
  if (!taskData || typeof taskData !== 'object' || !taskData.variantPricingAdjustments || typeof taskData.variantPricingAdjustments !== 'object') {
    return 1;
  }

  const key = contextKey || 'universal';
  const variantConfig = taskData.variantPricingAdjustments[key];
  const parsed = parseFloat(variantConfig?.retailMultiplier);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export function calculateTaskCost(taskData, adminSettings = {}, availableProcesses = [], availableMaterials = [], context = null) {
  if (!taskData || typeof taskData !== 'object') throw new TypeError(ERROR_MESSAGES.TASK_DATA_MUST_BE_OBJECT);
  if (!Array.isArray(availableProcesses)) throw new TypeError(ERROR_MESSAGES.AVAILABLE_PROCESSES_MUST_BE_ARRAY);
  if (!Array.isArray(availableMaterials)) throw new TypeError(ERROR_MESSAGES.AVAILABLE_MATERIALS_MUST_BE_ARRAY);
  const settings = getNormalizedSettings(adminSettings);
  let contextKey = null;
  if (context) { if (typeof context === 'string') { contextKey = context; } else if (context.metalType && context.karat) { contextKey = `${context.metalType}_${context.karat}`.toLowerCase().replace(/[^a-z0-9]/g, '_'); } }
  let totalLaborHours = 0; let totalProcessCost = 0; let totalMaterialCost = 0; let totalProcessMaterialCost = 0; let totalWeightedLaborCost = 0; let totalWeightedBaseMaterialsCost = 0;
  if (taskData.processes && Array.isArray(taskData.processes)) {
    taskData.processes.forEach((processSelection, index) => {
      let quantity = parseFloat(processSelection.quantity || 1);
      let process = processSelection.process;
      if (!process && processSelection.processId && availableProcesses.length > 0) { process = availableProcesses.find(p => p._id === processSelection.processId); }
      process = process || processSelection;
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
        totalWeightedLaborCost += weightedLabor * quantity; totalWeightedBaseMaterialsCost += weightedMaterials * quantity; totalLaborHours += (process.laborHours || 0) * quantity; totalProcessCost += currentTotalCost * quantity; totalProcessMaterialCost += weightedMaterials * quantity;
      }
    });
  }
  if (taskData.materials && Array.isArray(taskData.materials)) {
    taskData.materials.forEach((materialSelection, index) => {
      let quantity = parseFloat(materialSelection.quantity || 1);
      let material = materialSelection.material;
      if (!material && materialSelection.materialId && availableMaterials.length > 0) { material = availableMaterials.find(m => m._id === materialSelection.materialId); }
      material = material || materialSelection;
      if (material) { const matCost = calculateMaterialCost(material, quantity, adminSettings); const totalBase = matCost.baseCost * quantity; totalWeightedBaseMaterialsCost += totalBase; totalMaterialCost += matCost.totalCost; }
    });
  }
  const businessMultiplier = getBusinessMultiplierValue(adminSettings);
  const materialMarkup = enforceMinimumMaterialMarkup(settings.materialMarkup);
  const calculatedLaborCost = Math.round(totalWeightedLaborCost * 100) / 100;
  const minimumLaborPrice = normalizePositiveNumber(taskData.minimumLaborPrice);
  const laborCost = Math.max(calculatedLaborCost, minimumLaborPrice);
  const baseCost = totalWeightedBaseMaterialsCost + laborCost;
  const term1 = baseCost * businessMultiplier;
  const term2 = totalWeightedBaseMaterialsCost * (materialMarkup - 1);
  const calculatedRetailPrice = Math.round((term1 + term2) * 100) / 100;
  const variantRetailMultiplier = getVariantRetailMultiplier(taskData, contextKey);
  const adjustedCalculatedRetailPrice = Math.round((calculatedRetailPrice * variantRetailMultiplier) * 100) / 100;
  const globalMinimumRetailPrice = normalizePositiveNumber(settings.minimumTaskRetailPrice);
  const minimumRetailPrice = Math.max(
    globalMinimumRetailPrice,
    normalizePositiveNumber(taskData.minimumPrice)
  );
  const priceOverride = normalizePositiveNumber(taskData.priceOverride);
  const retailPriceBeforeRounding = priceOverride || Math.max(adjustedCalculatedRetailPrice, minimumRetailPrice);
  const priceRoundingIncrement = TASK_ROUNDING_INCREMENT;
  const roundedRetailPrice = roundToNearestIncrement(retailPriceBeforeRounding, priceRoundingIncrement);
  const retailPrice = Math.round(roundedRetailPrice * 100) / 100;
  const calculatedWholesalePrice = calculateWholesalePrice(retailPrice, baseCost, adminSettings);
  const globalMinimumWholesalePrice = normalizePositiveNumber(settings.minimumTaskWholesalePrice);
  const minimumWholesalePrice = Math.max(
    globalMinimumWholesalePrice,
    normalizePositiveNumber(taskData.minimumWholesalePrice)
  );
  const wholesalePriceBeforeRounding = Math.max(calculatedWholesalePrice, minimumWholesalePrice);
  const roundedWholesalePrice = roundToNearestIncrement(wholesalePriceBeforeRounding, priceRoundingIncrement);
  const wholesalePrice = Math.round(roundedWholesalePrice * 100) / 100;
  return {
    totalLaborHours: Math.round(totalLaborHours * 100) / 100,
    totalProcessCost: Math.round(totalProcessCost * 100) / 100,
    totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
    totalProcessMaterialCost: Math.round(totalProcessMaterialCost * 100) / 100,
    baseCost: Math.round(baseCost * 100) / 100,
    calculatedLaborCost,
    laborCost: Math.round(laborCost * 100) / 100,
    minimumLaborPrice,
    calculatedRetailPrice,
    variantRetailMultiplier,
    adjustedCalculatedRetailPrice,
    retailPriceBeforeRounding: Math.round(retailPriceBeforeRounding * 100) / 100,
    priceRoundingIncrement,
    roundingApplied: priceRoundingIncrement > 0 && Math.abs(retailPrice - retailPriceBeforeRounding) >= 0.01,
    retailPrice: Math.round(retailPrice * 100) / 100,
    globalMinimumRetailPrice,
    minimumPrice: minimumRetailPrice,
    priceOverride,
    calculatedWholesalePrice: Math.round(calculatedWholesalePrice * 100) / 100,
    wholesalePriceBeforeRounding: Math.round(wholesalePriceBeforeRounding * 100) / 100,
    wholesaleRoundingApplied: priceRoundingIncrement > 0 && Math.abs(wholesalePrice - wholesalePriceBeforeRounding) >= 0.01,
    wholesalePrice: Math.round(wholesalePrice * 100) / 100,
    globalMinimumWholesalePrice,
    minimumWholesalePrice,
    businessMultiplier: businessMultiplier,
    materialMarkup: materialMarkup,
    calculatedAt: new Date().toISOString()
  };
}