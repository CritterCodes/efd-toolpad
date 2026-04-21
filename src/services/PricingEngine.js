/**
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
  calculateTaskCost(taskData, adminSettings = {}, availableProcesses = [], availableMaterials = [], context = null, availableTools = []) { return calculateTaskCost(taskData, adminSettings, availableProcesses, availableMaterials, context, availableTools); }
  calculateLaborCost(laborHours, skillLevel = DEFAULT_SKILL_LEVEL, adminSettings = {}) { return calculateLaborCost(laborHours, skillLevel, adminSettings); }
  getHourlyRateForSkill(skillLevel, adminSettings = {}) { return getHourlyRateForSkill(skillLevel, adminSettings); }
  getBusinessMultiplier(adminSettings = {}) { return getBusinessMultiplierValue(adminSettings); }
}

const pricingEngine = new PricingEngine();
export default pricingEngine;
export { PricingEngine };
