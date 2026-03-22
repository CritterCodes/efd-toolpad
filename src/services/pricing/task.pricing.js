import { ERROR_MESSAGES, enforceMinimumMaterialMarkup } from '@/constants/pricing.constants.mjs';
import { getNormalizedSettings, getBusinessMultiplierValue } from './config.pricing.js';
import { calculateProcessCost } from './process.pricing.js';
import { calculateMaterialCost } from './material.pricing.js';
import { calculateWholesalePrice } from './business.pricing.js';

export function calculateTaskCost(taskData, adminSettings = {}, availableProcesses = [], availableMaterials = [], context = null) {
  if (!taskData || typeof taskData !== 'object') throw new TypeError(ERROR_MESSAGES.TASK_DATA_MUST_BE_OBJECT);
  if (!Array.isArray(availableProcesses)) throw new TypeError(ERROR_MESSAGES.AVAILABLE_PROCESSES_MUST_BE_ARRAY);
  if (!Array.isArray(availableMaterials)) throw new TypeError(ERROR_MESSAGES.AVAILABLE_MATERIALS_MUST_BE_ARRAY);
  const settings = getNormalizedSettings(adminSettings);
  let contextKey = null;
  if (context) { if (typeof context === 'string') { contextKey = context; } else if (context.metalType && context.karat) { contextKey = `${context.metalType}_${context.karat}`.toLowerCase().replace(/[^a-z0-9]/g, '_'); } }
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
}