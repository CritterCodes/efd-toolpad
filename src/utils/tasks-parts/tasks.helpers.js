export const calculateTaskCost = (task, adminSettings = null) => {
  if (!task || !adminSettings) return 0;
  
  const laborRate = adminSettings.laborRates?.[task.skillLevel] || adminSettings.laborRates?.standard || 30;
  const laborCost = (task.laborHours || 0) * laborRate;
  const baseCost = task.price || 0;
  
  return laborCost + baseCost;
};

/**
 * Validate task form data
 */
export const validateTaskForm = (formData) => {
  const errors = [];
  
  if (!formData.title || formData.title.trim().length === 0) {
    errors.push('Title is required');
  }
  
  if (!formData.category) {
    errors.push('Category is required');
  }
  
  if (formData.price !== undefined) {
    const price = parseFloat(formData.price);
    if (isNaN(price) || price < 0) {
      errors.push('Price must be a valid positive number');
    }
  }
  
  if (formData.laborHours !== undefined) {
    const hours = parseFloat(formData.laborHours);
    if (isNaN(hours) || hours < 0) {
      errors.push('Labor hours must be a valid positive number');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Transform task for form editing
 */
export const transformTaskForForm = (task) => {
  if (!task) return { ...DEFAULT_TASK_FORM };
  
  return {
    title: task.title || '',
    description: task.description || '',
    category: task.category || '',
    metalType: task.metalType || '',
    skillLevel: task.skillLevel || SKILL_LEVEL.STANDARD,
    price: task.price || 0,
    laborHours: task.laborHours || 0,
    sku: task.sku || '',
    isActive: task.isActive !== false // Default to true if not explicitly false
  };
};

/**
 * Filter tasks by search query
 */
export const filterTasksBySearch = (tasks, query) => {
  if (!query || !Array.isArray(tasks)) return tasks;
  
  const searchLower = query.toLowerCase();
  
  return tasks.filter(task => 
    task.title?.toLowerCase().includes(searchLower) ||
    task.description?.toLowerCase().includes(searchLower) ||
    task.sku?.toLowerCase().includes(searchLower) ||
    task.category?.toLowerCase().includes(searchLower)
  );
};

/**
 * Sort tasks by specified field and order
 */
export const sortTasks = (tasks, sortBy, sortOrder = 'asc') => {
  if (!Array.isArray(tasks)) return tasks;
  
  return [...tasks].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];
    
    // Handle different data types
    if (sortBy === 'price' || sortBy === 'laborHours') {
      aValue = parseFloat(aValue) || 0;
      bValue = parseFloat(bValue) || 0;
    } else if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    } else {
      aValue = String(aValue || '').toLowerCase();
      bValue = String(bValue || '').toLowerCase();
    }
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
};

/**
 * Group tasks by category
 */
export const groupTasksByCategory = (tasks) => {
  if (!Array.isArray(tasks)) return {};
  
  return tasks.reduce((groups, task) => {
    const category = task.category || 'uncategorized';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(task);
    return groups;
  }, {});
};

/**
 * Get task statistics from array
 */
export const getTaskArrayStatistics = (tasks) => {
  if (!Array.isArray(tasks)) return null;
  
  const active = tasks.filter(t => t.isActive !== false);
  const inactive = tasks.filter(t => t.isActive === false);
  
  const totalPrice = tasks.reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0);
  const avgPrice = tasks.length > 0 ? totalPrice / tasks.length : 0;
  
  const categories = [...new Set(tasks.map(t => t.category).filter(Boolean))];
  const metalTypes = [...new Set(tasks.map(t => t.metalType).filter(Boolean))];
  
  return {
    total: tasks.length,
    active: active.length,
    inactive: inactive.length,
    totalPrice,
    avgPrice,
    categories: categories.length,
    metalTypes: metalTypes.length
  };
};
