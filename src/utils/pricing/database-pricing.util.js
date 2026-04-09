import { calculateTaskPricing } from './core-pricing.util';
import { getAvailableMetalVariants } from './variant-pricing.util';

/**
 * Transform task for database storage with pricing
 * @param {Object} taskData - Task data
 * @param {Object} adminSettings - Admin settings
 * @returns {Object} Task data ready for database
 */
export function prepareTaskForDatabase(taskData, adminSettings = {}) {
  const pricing = calculateTaskPricing(taskData, null, adminSettings);
  
  return {
    ...taskData,
    ...pricing,
    metalVariants: getAvailableMetalVariants(taskData),
    updatedAt: new Date(),
    pricingCalculatedAt: new Date()
  };
}