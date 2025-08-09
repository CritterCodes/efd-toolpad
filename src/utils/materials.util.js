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
  displayName: '',
  category: '',
  unitCost: '',
  unitType: 'application',
  karat: '',
  compatibleMetals: [],
  supplier: '',
  description: '',
  isActive: true,
  // Stuller integration fields
  stuller_item_number: '',
  auto_update_pricing: false,
  last_price_update: null,
  // Portion tracking fields
  portionsPerUnit: 1,
  portionType: '',
  costPerPortion: 0
};

/**
 * Format category display name
 * @param {string} category - Internal category name
 * @returns {string} Formatted display name
 */
export const formatCategoryDisplay = (category) => {
  return category.replace('_', ' ').toUpperCase();
};

/**
 * Format unit type display name
 * @param {string} unitType - Internal unit type
 * @returns {string} Formatted display name
 */
export const formatUnitTypeDisplay = (unitType) => {
  return unitType.toUpperCase();
};

/**
 * Get metal option label by value
 * @param {string} metalValue - Metal value
 * @returns {string} Metal label or the value if not found
 */
export const getMetalLabel = (metalValue) => {
  const metal = METAL_OPTIONS.find(m => m.value === metalValue);
  return metal?.label || metalValue;
};

/**
 * Get karat option label by value
 * @param {string} karatValue - Karat value
 * @returns {string} Karat label or the value if not found
 */
export const getKaratLabel = (karatValue) => {
  const karat = KARAT_OPTIONS.find(k => k.value === karatValue);
  return karat?.label || karatValue;
};

/**
 * Format price display
 * @param {number} price - Price value
 * @returns {string} Formatted price string
 */
export const formatPrice = (price) => {
  return `$${(price || 0).toFixed(2)}`;
};

/**
 * Format portion price display
 * @param {number} price - Price value
 * @returns {string} Formatted portion price string (4 decimal places)
 */
export const formatPortionPrice = (price) => {
  return `$${(price || 0).toFixed(4)}`;
};

/**
 * Check if material has portions
 * @param {Object} material - Material object
 * @returns {boolean} True if material has portions
 */
export const hasPortions = (material) => {
  return material.portionsPerUnit && material.portionsPerUnit > 1;
};

/**
 * Calculate portion price for display
 * @param {number} unitCost - Unit cost
 * @param {number} portionsPerUnit - Portions per unit
 * @returns {number} Calculated portion price
 */
export const calculatePortionPrice = (unitCost, portionsPerUnit) => {
  const cost = parseFloat(unitCost) || 0;
  const portions = parseInt(portionsPerUnit) || 1;
  return portions > 0 ? cost / portions : 0;
};

/**
 * Validate material form data
 * @param {Object} formData - Form data to validate
 * @returns {Object} Validation result with isValid and errors
 */
export const validateMaterialForm = (formData) => {
  const errors = [];

  if (!formData.displayName?.trim()) {
    errors.push('Display name is required');
  }

  if (!formData.category) {
    errors.push('Category is required');
  }

  if (!formData.unitType) {
    errors.push('Unit type is required');
  }

  if (!formData.unitCost || parseFloat(formData.unitCost) <= 0) {
    errors.push('Unit cost must be greater than 0');
  }

  if (formData.portionsPerUnit && parseInt(formData.portionsPerUnit) < 1) {
    errors.push('Portions per unit must be at least 1');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Prepare form data for API submission
 * @param {Object} formData - Raw form data
 * @returns {Object} Processed data ready for API
 */
export const prepareFormDataForSubmission = (formData) => {
  return {
    ...formData,
    unitCost: parseFloat(formData.unitCost) || 0,
    portionsPerUnit: parseInt(formData.portionsPerUnit) || 1,
    costPerPortion: parseFloat(formData.costPerPortion) || 0,
    isActive: formData.isActive !== false
  };
};

/**
 * Transform material data for form editing
 * @param {Object} material - Material object from API
 * @returns {Object} Form data object
 */
export const transformMaterialForForm = (material) => {
  return {
    displayName: material.displayName || '',
    category: material.category || '',
    unitCost: material.unitCost?.toString() || '',
    unitType: material.unitType || 'application',
    karat: material.karat || '',
    compatibleMetals: material.compatibleMetals || [],
    supplier: material.supplier || '',
    description: material.description || '',
    isActive: material.isActive !== false,
    stuller_item_number: material.stuller_item_number || '',
    auto_update_pricing: material.auto_update_pricing || false,
    last_price_update: material.last_price_update,
    portionsPerUnit: material.portionsPerUnit || 1,
    portionType: material.portionType || '',
    costPerPortion: material.costPerPortion || 0
  };
};

/**
 * Filter materials by search criteria
 * @param {Array} materials - Array of materials
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered materials
 */
export const filterMaterials = (materials, filters) => {
  return materials.filter(material => {
    // Search by name
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesName = material.displayName?.toLowerCase().includes(searchLower);
      const matchesDescription = material.description?.toLowerCase().includes(searchLower);
      const matchesSupplier = material.supplier?.toLowerCase().includes(searchLower);
      const matchesKarat = material.karat?.toLowerCase().includes(searchLower);
      
      if (!matchesName && !matchesDescription && !matchesSupplier && !matchesKarat) {
        return false;
      }
    }

    // Filter by category
    if (filters.category && material.category !== filters.category) {
      return false;
    }

    // Filter by active status
    if (filters.isActive !== undefined && material.isActive !== filters.isActive) {
      return false;
    }

    // Filter by supplier
    if (filters.supplier && material.supplier !== filters.supplier) {
      return false;
    }

    // Filter by metal type (compatible metals)
    if (filters.metalType && (!material.compatibleMetals || !material.compatibleMetals.includes(filters.metalType))) {
      return false;
    }

    // Filter by karat/purity
    if (filters.karat && material.karat !== filters.karat) {
      return false;
    }

    // Backward compatibility - Filter by metal compatibility
    if (filters.metal && (!material.compatibleMetals || !material.compatibleMetals.includes(filters.metal))) {
      return false;
    }

    return true;
  });
};

/**
 * Sort materials by specified criteria
 * @param {Array} materials - Array of materials
 * @param {string} sortBy - Sort field
 * @param {string} sortOrder - Sort order ('asc' or 'desc')
 * @returns {Array} Sorted materials
 */
export const sortMaterials = (materials, sortBy = 'displayName', sortOrder = 'asc') => {
  return [...materials].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    // Handle special cases
    if (sortBy === 'unitCost') {
      aValue = parseFloat(aValue) || 0;
      bValue = parseFloat(bValue) || 0;
    } else if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue?.toLowerCase() || '';
    }

    if (aValue < bValue) {
      return sortOrder === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortOrder === 'asc' ? 1 : -1;
    }
    return 0;
  });
};

/**
 * Get unique values from materials for filter options
 * @param {Array} materials - Array of materials
 * @param {string} field - Field to extract unique values from
 * @returns {Array} Unique values
 */
export const getUniqueValues = (materials, field) => {
  const values = materials
    .map(material => material[field])
    .filter(value => value != null && value !== '');
  
  return [...new Set(values)].sort();
};

/**
 * Generate summary statistics for materials
 * @param {Array} materials - Array of materials
 * @returns {Object} Summary statistics
 */
export const generateMaterialStats = (materials) => {
  const activeCount = materials.filter(m => m.isActive !== false).length;
  const inactiveCount = materials.length - activeCount;
  
  const totalValue = materials.reduce((sum, material) => {
    return sum + (parseFloat(material.unitCost) || 0);
  }, 0);

  const categoryCounts = {};
  materials.forEach(material => {
    const category = material.category || 'unknown';
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
  });

  return {
    total: materials.length,
    active: activeCount,
    inactive: inactiveCount,
    totalValue: totalValue,
    averageValue: materials.length > 0 ? totalValue / materials.length : 0,
    categoryCounts
  };
};
