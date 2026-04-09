import { metalKeys } from '../metalUtils.js';

/**
 * Generate unique task ID
 */
export function generateTaskId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `task_${timestamp}_${random}`;
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
