/**
 * Materials Utilities
 * Helper functions and constants for materials management
 */

/**
 * Material categories available in the system
 */
export const MATERIAL_CATEGORIES = [
  'solder',
  'consumable',
  'sizing_material',
  'prong_material',
  'finishing',
  'tools',
  'other'
];

/**
 * Unit types for materials
 */
export const UNIT_TYPES = [
  'application',
  'sheet',
  'spool',
  'stick',
  'jar',
  'tube',
  'bottle',
  'gram',
  'piece',
  'inch',
  'foot',
  'yard',
  'hour'
];

/**
 * Portion types for material subdivision
 */
export const PORTION_TYPES = [
  { value: '', label: 'Same as unit (no portions)' },
  { value: 'clip', label: 'Clip' },
  { value: 'size', label: 'Size' },
  { value: 'application', label: 'Application' },
  { value: 'inch', label: 'Inch' },
  { value: 'gram', label: 'Gram' },
  { value: 'drop', label: 'Drop' },
  { value: 'dab', label: 'Dab' },
  { value: 'dip', label: 'Dip' },
  { value: 'piece', label: 'Piece' }
];

/**
 * Karat/purity options for materials
 */
export const KARAT_OPTIONS = [
  { value: '', label: 'Not applicable' },
  { value: '10K', label: '10K' },
  { value: '14K', label: '14K' },
  { value: '18K', label: '18K' },
  { value: '22K', label: '22K' },
  { value: '24K', label: '24K' },
  { value: '925', label: '925 Sterling Silver' },
  { value: '950', label: '950 Platinum' },
  { value: '999', label: '999 Fine Silver' }
];

/**
 * Metal options for compatibility
 */
export const METAL_OPTIONS = [
  { value: 'yellow_gold', label: 'Yellow Gold' },
  { value: 'white_gold', label: 'White Gold' }, 
  { value: 'rose_gold', label: 'Rose Gold' },
  { value: 'sterling_silver', label: 'Sterling Silver' },
  { value: 'fine_silver', label: 'Fine Silver' },
  { value: 'platinum', label: 'Platinum' },
  { value: 'mixed', label: 'Mixed Metals' }
];

/**
 * Default form data structure for materials
 */
export const DEFAULT_MATERIAL_FORM = {
  // General material information
  name: '', // Internal name (auto-generated from displayName)
  displayName: '',
  category: '',
  unitType: 'application',
  supplier: 'Stuller',
  description: '',
  isActive: true,
  
  // Metal dependency configuration
  isMetalDependent: true, // Default to true - most materials are metal dependent
  
  // Portion tracking fields
  portionsPerUnit: 1,
  portionType: 'piece',
  
  // Multi-variant structure - Array of Stuller products
  stullerProducts: []
};

/**
 * Format category display name
 * @param {string} category - Internal category name
 * @returns {string} Formatted display name
 */