import { metalKeys, getDisplayName } from '../metalUtils.js';

/**
 * Validate task structure
 */
export function validateTaskStructure(task) {
  const errors = [];

  // Required fields
  if (!task.name || task.name.trim().length === 0) {
    errors.push('Task name is required');
  }

  if (!task.category || task.category.trim().length === 0) {
    errors.push('Task category is required');
  }

  if (!task.processes || !Array.isArray(task.processes) || task.processes.length === 0) {
    errors.push('At least one process is required');
  }

  // Universal pricing validation
  if (!task.universalPricing || typeof task.universalPricing !== 'object') {
    errors.push('Universal pricing structure is required');
  } else {
    const pricing = task.universalPricing;

    // Check for at least one metal pricing
    const hasAnyPricing = Object.keys(pricing).some(key => 
      metalKeys.includes(key) && pricing[key] && Object.keys(pricing[key]).length > 0
    );

    if (!hasAnyPricing) {
      errors.push('At least one metal pricing must be defined');
    }

    // Validate individual metal pricing structures
    for (const metalKey of metalKeys) {
      if (pricing[metalKey] && typeof pricing[metalKey] === 'object') {
        for (const [karat, price] of Object.entries(pricing[metalKey])) {
          if (isNaN(price) || price < 0) {
            errors.push(`Invalid price for ${getDisplayName(metalKey)} ${karat}`);
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
