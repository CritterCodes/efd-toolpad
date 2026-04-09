import { TASK_CATEGORIES, TASK_METAL_TYPES, TASK_SKILL_LEVELS } from './tasks.constants';
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
    [SKILL_LEVEL.BASIC]: 'success',
    [SKILL_LEVEL.STANDARD]: 'primary',
    [SKILL_LEVEL.ADVANCED]: 'warning',
    [SKILL_LEVEL.EXPERT]: 'error'
  };
  
  return colorMap[skillLevel] || 'primary';
};

/**
 * Calculate estimated total cost
 */
