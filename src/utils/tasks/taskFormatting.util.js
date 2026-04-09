import { getTaskSupportedMetals, getTaskSupportedKarats } from './taskContext.util.js';
import { calculateTaskComplexity, calculateAverageTaskPrice, getTaskPriceRange } from './taskPricing.util.js';
import { generateTaskId } from './taskManipulation.util.js';
import { validateTaskStructure } from './taskValidation.util.js';

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
