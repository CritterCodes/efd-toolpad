import { DEFAULT_SKILL_LEVEL, ERROR_MESSAGES, getSkillLevelMultiplier, enforceMinimumMaterialMarkup, isValidSkillLevel } from '@/constants/pricing.constants.mjs';
import { getNormalizedSettings, getBusinessMultiplierValue } from './config.pricing.js';
import { getMaterialBaseRawCost } from './material.pricing.js';
import { calculateLaborCost, getHourlyRateForSkill } from './labor.pricing.js';
import { calculateBusinessMultiplier, enforceMinimumBusinessMultiplier } from '@/constants/pricing.constants.mjs';

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
        const key = `${prod.metalType}_${prod.karat}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (!foundVariants.has(key)) {
          foundVariants.add(key);
          const metalLabel = prod.metalType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          const label = `${metalLabel} ${prod.karat.toUpperCase()}`;
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
}