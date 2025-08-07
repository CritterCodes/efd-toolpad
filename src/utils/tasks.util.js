/**
 * Tasks Utilities
 * Constants, formatters, and helper functions for task management
 */

// Task Categories
export const TASK_CATEGORIES = [
  'sizing',
  'stone_setting',
  'repair',
  'restoration',
  'cleaning',
  'engraving',
  'manufacturing',
  'custom_work',
  'rhodium_plating',
  'soldering',
  'polishing',
  'chain_repair',
  'clasp_repair',
  'prong_repair',
  'retipping',
  'mounting',
  'setting',
  'casting',
  'fabrication'
];

// Metal Types (using same as processes for consistency)
export const TASK_METAL_TYPES = [
  { value: 'yellow_gold', label: 'Yellow Gold' },
  { value: 'white_gold', label: 'White Gold' },
  { value: 'rose_gold', label: 'Rose Gold' },
  { value: 'sterling_silver', label: 'Sterling Silver' },
  { value: 'fine_silver', label: 'Fine Silver' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'palladium', label: 'Palladium' },
  { value: 'titanium', label: 'Titanium' },
  { value: 'stainless_steel', label: 'Stainless Steel' },
  { value: 'alternative', label: 'Alternative Metal' },
  { value: 'mixed', label: 'Mixed Metals' },
  { value: 'n_a', label: 'Not Applicable' }
];

// Skill Levels
export const TASK_SKILL_LEVELS = [
  { value: 'basic', label: 'Basic' },
  { value: 'standard', label: 'Standard' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'expert', label: 'Expert' }
];

// Sort Options
export const TASK_SORT_OPTIONS = [
  { value: 'title', label: 'Title' },
  { value: 'category', label: 'Category' },
  { value: 'price', label: 'Price' },
  { value: 'laborHours', label: 'Labor Hours' },
  { value: 'createdAt', label: 'Created Date' },
  { value: 'updatedAt', label: 'Updated Date' }
];

// Default form values
export const DEFAULT_TASK_FORM = {
  title: '',
  description: '',
  category: '',
  metalType: '',
  skillLevel: 'standard',
  price: 0,
  laborHours: 0,
  sku: '',
  isActive: true
};

/**
 * Format price with currency symbol
 */
export const formatPrice = (price) => {
  if (typeof price !== 'number') {
    price = parseFloat(price) || 0;
  }
  return `$${price.toFixed(2)}`;
};

/**
 * Format labor hours
 */
export const formatLaborHours = (hours) => {
  if (typeof hours !== 'number') {
    hours = parseFloat(hours) || 0;
  }
  return `${hours} hr${hours !== 1 ? 's' : ''}`;
};

/**
 * Format category for display
 */
export const formatCategoryDisplay = (category) => {
  if (!category) return '';
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Format metal type for display
 */
export const formatMetalTypeDisplay = (metalType) => {
  const metal = TASK_METAL_TYPES.find(m => m.value === metalType);
  return metal ? metal.label : metalType || '';
};

/**
 * Format skill level for display
 */
export const formatSkillLevelDisplay = (skillLevel) => {
  const skill = TASK_SKILL_LEVELS.find(s => s.value === skillLevel);
  return skill ? skill.label : skillLevel || 'Standard';
};

/**
 * Get category color for chips
 */
export const getCategoryColor = (category) => {
  const colorMap = {
    'sizing': 'primary',
    'stone_setting': 'secondary',
    'repair': 'warning',
    'restoration': 'info',
    'cleaning': 'success',
    'engraving': 'default',
    'manufacturing': 'primary',
    'custom_work': 'secondary',
    'rhodium_plating': 'info',
    'soldering': 'warning',
    'polishing': 'success',
    'chain_repair': 'error',
    'clasp_repair': 'error',
    'prong_repair': 'warning',
    'retipping': 'warning',
    'mounting': 'primary',
    'setting': 'secondary',
    'casting': 'info',
    'fabrication': 'default'
  };
  
  return colorMap[category] || 'default';
};

/**
 * Get skill level color
 */
export const getSkillLevelColor = (skillLevel) => {
  const colorMap = {
    'basic': 'success',
    'standard': 'primary',
    'advanced': 'warning',
    'expert': 'error'
  };
  
  return colorMap[skillLevel] || 'primary';
};

/**
 * Calculate estimated total cost
 */
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
    skillLevel: task.skillLevel || 'standard',
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
