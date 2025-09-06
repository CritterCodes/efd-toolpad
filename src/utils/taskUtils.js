/**
 * taskUtils.js - Task management and structure utilities
 * 
 * Utility functions for task manipulation, validation, sorting, and formatting
 * specific to the universal task system.
 */

import { metalKeys, getDisplayName } from './metalUtils.js';

/**
 * Generate unique task ID
 */
export function generateTaskId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `task_${timestamp}_${random}`;
}

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
 * Get task price for specific metal/karat combination
 */
export function getTaskPrice(task, metalType, karat) {
  if (!task.universalPricing || !task.universalPricing[metalType]) {
    return null;
  }

  return task.universalPricing[metalType][karat] || null;
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

/**
 * Sort tasks by various criteria
 */
export function sortTasks(tasks, criteria = 'name', direction = 'asc') {
  const sortedTasks = [...tasks];

  sortedTasks.sort((a, b) => {
    let comparison = 0;

    switch (criteria) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      
      case 'category':
        comparison = a.category.localeCompare(b.category);
        break;
      
      case 'created':
        comparison = new Date(a.createdAt) - new Date(b.createdAt);
        break;
      
      case 'updated':
        comparison = new Date(a.updatedAt) - new Date(b.updatedAt);
        break;
      
      case 'complexity':
        const aComplexity = calculateTaskComplexity(a);
        const bComplexity = calculateTaskComplexity(b);
        comparison = aComplexity - bComplexity;
        break;
      
      case 'avgPrice':
        const aAvgPrice = calculateAverageTaskPrice(a);
        const bAvgPrice = calculateAverageTaskPrice(b);
        comparison = aAvgPrice - bAvgPrice;
        break;

      default:
        comparison = 0;
    }

    return direction === 'desc' ? -comparison : comparison;
  });

  return sortedTasks;
}

/**
 * Filter tasks by various criteria
 */
export function filterTasks(tasks, filters = {}) {
  return tasks.filter(task => {
    // Category filter
    if (filters.category && task.category !== filters.category) {
      return false;
    }

    // Name search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const nameMatch = task.name.toLowerCase().includes(searchLower);
      const descMatch = task.description && task.description.toLowerCase().includes(searchLower);
      if (!nameMatch && !descMatch) {
        return false;
      }
    }

    // Metal support filter
    if (filters.metalType) {
      if (!taskSupportsMetalContext(task, filters.metalType, filters.karat)) {
        return false;
      }
    }

    // Process filter
    if (filters.processId) {
      if (!task.processes.includes(filters.processId)) {
        return false;
      }
    }

    // Price range filter
    if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
      const avgPrice = calculateAverageTaskPrice(task);
      if (filters.minPrice !== undefined && avgPrice < filters.minPrice) {
        return false;
      }
      if (filters.maxPrice !== undefined && avgPrice > filters.maxPrice) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calculate task complexity score
 */
export function calculateTaskComplexity(task) {
  let complexity = 0;

  // Base complexity from process count
  complexity += task.processes.length * 10;

  // Complexity from metal support variety
  const supportedMetals = getTaskSupportedMetals(task);
  complexity += supportedMetals.length * 5;

  // Complexity from total karat options
  let totalKarats = 0;
  supportedMetals.forEach(metalType => {
    totalKarats += getTaskSupportedKarats(task, metalType).length;
  });
  complexity += totalKarats * 2;

  // Description complexity
  if (task.description && task.description.length > 100) {
    complexity += 5;
  }

  return complexity;
}

/**
 * Calculate average price across all metal/karat combinations
 */
export function calculateAverageTaskPrice(task) {
  if (!task.universalPricing) return 0;

  let totalPrice = 0;
  let priceCount = 0;

  Object.values(task.universalPricing).forEach(metalPricing => {
    if (typeof metalPricing === 'object') {
      Object.values(metalPricing).forEach(price => {
        if (typeof price === 'number' && !isNaN(price)) {
          totalPrice += price;
          priceCount++;
        }
      });
    }
  });

  return priceCount > 0 ? totalPrice / priceCount : 0;
}

/**
 * Get task price range (min/max across all metals)
 */
export function getTaskPriceRange(task) {
  if (!task.universalPricing) return { min: null, max: null };

  let minPrice = Infinity;
  let maxPrice = -Infinity;
  let hasAnyPrice = false;

  Object.values(task.universalPricing).forEach(metalPricing => {
    if (typeof metalPricing === 'object') {
      Object.values(metalPricing).forEach(price => {
        if (typeof price === 'number' && !isNaN(price)) {
          hasAnyPrice = true;
          minPrice = Math.min(minPrice, price);
          maxPrice = Math.max(maxPrice, price);
        }
      });
    }
  });

  if (!hasAnyPrice) {
    return { min: null, max: null };
  }

  return {
    min: minPrice === Infinity ? null : minPrice,
    max: maxPrice === -Infinity ? null : maxPrice
  };
}

/**
 * Create task summary for display
 */
export function createTaskSummary(task) {
  const supportedMetals = getTaskSupportedMetals(task);
  const priceRange = getTaskPriceRange(task);
  const complexity = calculateTaskComplexity(task);

  return {
    id: task._id,
    name: task.name,
    category: task.category,
    processCount: task.processes.length,
    supportedMetals: supportedMetals.length,
    totalPricingOptions: supportedMetals.reduce((total, metalType) => 
      total + getTaskSupportedKarats(task, metalType).length, 0
    ),
    priceRange,
    complexity,
    averagePrice: calculateAverageTaskPrice(task)
  };
}

/**
 * Group tasks by category
 */
export function groupTasksByCategory(tasks) {
  const grouped = {};

  tasks.forEach(task => {
    const category = task.category || 'Uncategorized';
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(task);
  });

  return grouped;
}

/**
 * Clone task with new ID (for duplication)
 */
export function cloneTask(task, namePrefix = 'Copy of ') {
  const cloned = JSON.parse(JSON.stringify(task));
  
  // Remove MongoDB ID if present
  delete cloned._id;
  
  // Generate new ID and modify name
  cloned.id = generateTaskId();
  cloned.name = `${namePrefix}${task.name}`;
  
  // Update timestamps
  const now = new Date().toISOString();
  cloned.createdAt = now;
  cloned.updatedAt = now;

  return cloned;
}

/**
 * Check if two tasks are equivalent (same structure/pricing)
 */
export function tasksAreEquivalent(task1, task2) {
  // Compare basic fields
  if (task1.name !== task2.name || 
      task1.category !== task2.category ||
      task1.description !== task2.description) {
    return false;
  }

  // Compare processes
  if (task1.processes.length !== task2.processes.length) {
    return false;
  }

  const sortedProcesses1 = [...task1.processes].sort();
  const sortedProcesses2 = [...task2.processes].sort();
  
  if (JSON.stringify(sortedProcesses1) !== JSON.stringify(sortedProcesses2)) {
    return false;
  }

  // Compare universal pricing
  return JSON.stringify(task1.universalPricing) === JSON.stringify(task2.universalPricing);
}

/**
 * Merge task pricing (for updates)
 */
export function mergeTaskPricing(existingTask, newPricing) {
  const merged = JSON.parse(JSON.stringify(existingTask));

  if (!merged.universalPricing) {
    merged.universalPricing = {};
  }

  // Merge new pricing with existing
  Object.keys(newPricing).forEach(metalType => {
    if (metalKeys.includes(metalType)) {
      if (!merged.universalPricing[metalType]) {
        merged.universalPricing[metalType] = {};
      }
      
      Object.assign(merged.universalPricing[metalType], newPricing[metalType]);
    }
  });

  return merged;
}

/**
 * Export task to JSON format
 */
export function exportTaskToJSON(task) {
  const exportData = {
    ...task,
    exportedAt: new Date().toISOString(),
    version: '2.0'
  };

  // Remove internal MongoDB fields
  delete exportData._id;
  delete exportData.__v;

  return JSON.stringify(exportData, null, 2);
}

/**
 * Import task from JSON format
 */
export function importTaskFromJSON(jsonString) {
  try {
    const imported = JSON.parse(jsonString);
    
    // Validate structure
    const validation = validateTaskStructure(imported);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    // Generate new ID and update timestamps
    imported.id = generateTaskId();
    const now = new Date().toISOString();
    imported.createdAt = now;
    imported.updatedAt = now;
    imported.importedAt = now;

    return { success: true, task: imported };
  } catch (error) {
    return { success: false, errors: ['Invalid JSON format'] };
  }
}
