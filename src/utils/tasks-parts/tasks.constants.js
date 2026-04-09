/**
 * Tasks Utilities
 * Constants, formatters, and helper functions for task management
 */

// Import skill level constants for consistency
import { SKILL_LEVEL } from '@/constants/pricing.constants.mjs';

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

// Skill Levels - Uses constants from pricing.constants.mjs for consistency
export const TASK_SKILL_LEVELS = [
  { value: SKILL_LEVEL.BASIC, label: 'Basic' },
  { value: SKILL_LEVEL.STANDARD, label: 'Standard' },
  { value: SKILL_LEVEL.ADVANCED, label: 'Advanced' },
  { value: SKILL_LEVEL.EXPERT, label: 'Expert' }
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
  skillLevel: SKILL_LEVEL.STANDARD,
  price: 0,
  laborHours: 0,
  sku: '',
  isActive: true
};

/**
 * Format price with currency symbol
 */
