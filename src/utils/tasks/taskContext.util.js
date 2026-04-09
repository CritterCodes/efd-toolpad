import { metalKeys } from '../metalUtils.js';

/**
 * Get supported metals for a task
 */
export function getTaskSupportedMetals(task) {
  if (!task.universalPricing) return [];

  return metalKeys.filter(metalKey => 
    task.universalPricing[metalKey] && 
    Object.keys(task.universalPricing[metalKey]).length > 0
  );
}

/**
 * Get supported karats for a task metal
 */
export function getTaskSupportedKarats(task, metalType) {
  if (!task.universalPricing || !task.universalPricing[metalType]) {
    return [];
  }

  return Object.keys(task.universalPricing[metalType]).sort((a, b) => {
    // Sort karats numerically
    const aNum = parseInt(a);
    const bNum = parseInt(b);
    
    if (isNaN(aNum) || isNaN(bNum)) {
      return a.localeCompare(b);
    }
    
    return bNum - aNum; // Descending order (highest karat first)
  });
}

/**
 * Check if task supports metal context
 */
export function taskSupportsMetalContext(task, metalType, karat = null) {
  if (!task.universalPricing || !task.universalPricing[metalType]) {
    return false;
  }

  if (karat === null) {
    return Object.keys(task.universalPricing[metalType]).length > 0;
  }

  return task.universalPricing[metalType][karat] !== undefined;
}
