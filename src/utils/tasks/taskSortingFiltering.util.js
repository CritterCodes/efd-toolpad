import { calculateTaskComplexity, calculateAverageTaskPrice } from './taskPricing.util.js';
import { taskSupportsMetalContext } from './taskContext.util.js';

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
