/**
 * Processes Utilities
 * Constants, formatters, and helper functions for repair processes
 */

// Process Categories
export const PROCESS_CATEGORIES = [
  'sizing',
  'stone_setting',
  'repair',
  'restoration',
  'cleaning',
  'engraving',
  'manufacturing',
  'custom_work',
  'rhodium_plating',
  'soldering'
];

// Skill Levels
export const SKILL_LEVELS = [
  { value: 'basic', label: 'Basic', multiplier: 0.75 },
  { value: 'standard', label: 'Standard', multiplier: 1.0 },
  { value: 'advanced', label: 'Advanced', multiplier: 1.25 },
  { value: 'expert', label: 'Expert', multiplier: 1.5 }
];

// Metal Types
export const METAL_TYPES = [
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

// Karat/Purity Options organized by metal type
export const KARAT_OPTIONS = {
  yellow_gold: [
    { value: '10k', label: '10K' },
    { value: '14k', label: '14K' },
    { value: '18k', label: '18K' },
    { value: '22k', label: '22K' },
    { value: '24k', label: '24K' }
  ],
  white_gold: [
    { value: '10k', label: '10K' },
    { value: '14k', label: '14K' },
    { value: '18k', label: '18K' }
  ],
  rose_gold: [
    { value: '10k', label: '10K' },
    { value: '14k', label: '14K' },
    { value: '18k', label: '18K' }
  ],
  sterling_silver: [
    { value: '925', label: '925' },
    { value: '900', label: '900' }
  ],
  fine_silver: [
    { value: '999', label: '999' }
  ],
  platinum: [
    { value: '950', label: '950' },
    { value: '900', label: '900' }
  ],
  palladium: [
    { value: '950', label: '950' },
    { value: '900', label: '900' }
  ],
  titanium: [
    { value: 'grade1', label: 'Grade 1' },
    { value: 'grade2', label: 'Grade 2' },
    { value: 'grade4', label: 'Grade 4' }
  ],
  stainless_steel: [
    { value: '316l', label: '316L' },
    { value: '304', label: '304' }
  ],
  alternative: [
    { value: 'na', label: 'N/A' }
  ],
  mixed: [
    { value: 'na', label: 'N/A' }
  ],
  n_a: [
    { value: 'na', label: 'N/A' }
  ]
};

// Complexity Multipliers
export const COMPLEXITY_MULTIPLIERS = [
  { value: 0.5, label: 'Very Simple (0.5x)' },
  { value: 0.75, label: 'Simple (0.75x)' },
  { value: 1.0, label: 'Standard (1.0x)' },
  { value: 1.25, label: 'Complex (1.25x)' },
  { value: 1.5, label: 'Very Complex (1.5x)' },
  { value: 2.0, label: 'Extremely Complex (2.0x)' }
];

// Default form values
export const DEFAULT_PROCESS_FORM = {
  displayName: '',
  category: '',
  laborHours: 0,
  skillLevel: 'standard',
  metalType: '',
  karat: '',
  metalComplexityMultiplier: 1.0,
  description: '',
  materials: [],
  isActive: true
};

/**
 * Get available karat/purity options for a specific metal type
 */
export const getKaratOptionsForMetal = (metalType) => {
  return KARAT_OPTIONS[metalType] || [{ value: 'na', label: 'N/A' }];
};

/**
 * Format price with currency symbol
 */
export const formatPrice = (price) => {
  if (price === null || price === undefined || isNaN(price)) return '$0.00';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price);
};

/**
 * Format category for display
 */
export const formatCategoryDisplay = (category) => {
  if (!category) return 'Unknown';
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Format skill level for display
 */
export const formatSkillLevelDisplay = (skillLevel) => {
  const skill = SKILL_LEVELS.find(s => s.value === skillLevel);
  return skill ? skill.label : skillLevel || 'Standard';
};

/**
 * Format metal type for display
 */
export const formatMetalTypeDisplay = (metalType) => {
  const metal = METAL_TYPES.find(m => m.value === metalType);
  return metal ? metal.label : metalType || '';
};

/**
 * Get skill level multiplier
 */
export const getSkillLevelMultiplier = (skillLevel) => {
  const skill = SKILL_LEVELS.find(s => s.value === skillLevel);
  return skill ? skill.multiplier : 1.0;
};

/**
 * Get skill level label
 */
export const getSkillLevelLabel = (skillLevel) => {
  const skill = SKILL_LEVELS.find(s => s.value === skillLevel);
  return skill ? skill.label : skillLevel || 'Standard';
};

/**
 * Get metal type label
 */
export const getMetalTypeLabel = (metalType) => {
  const metal = METAL_TYPES.find(m => m.value === metalType);
  return metal ? metal.label : metalType || '';
};

/**
 * Get karat label
 */
export const getKaratLabel = (karat, metalType = null) => {
  if (!karat) return '';
  
  // If metalType is provided, search within that metal's options
  if (metalType && KARAT_OPTIONS[metalType]) {
    const karatOption = KARAT_OPTIONS[metalType].find(k => k.value === karat);
    if (karatOption) return karatOption.label;
  }
  
  // Fallback: search through all metal types
  for (const metalKarats of Object.values(KARAT_OPTIONS)) {
    const karatOption = metalKarats.find(k => k.value === karat);
    if (karatOption) return karatOption.label;
  }
  
  // If not found, return the original value
  return karat;
};

/**
 * Get complexity multiplier label
 */
export const getComplexityMultiplierLabel = (multiplier) => {
  const option = COMPLEXITY_MULTIPLIERS.find(c => c.value === parseFloat(multiplier));
  return option ? option.label : `${multiplier}x`;
};

/**
 * Validate process form data
 */
export const validateProcessForm = (formData) => {
  const errors = {};

  if (!formData.displayName || !formData.displayName.trim()) {
    errors.displayName = 'Display name is required';
  }

  if (!formData.category || !formData.category.trim()) {
    errors.category = 'Category is required';
  }

  const laborHours = parseFloat(formData.laborHours);
  if (isNaN(laborHours) || laborHours < 0 || laborHours > 8) {
    errors.laborHours = 'Labor hours must be between 0 and 8';
  }

  if (formData.skillLevel && !SKILL_LEVELS.some(s => s.value === formData.skillLevel)) {
    errors.skillLevel = 'Invalid skill level';
  }

  const multiplier = parseFloat(formData.metalComplexityMultiplier);
  if (isNaN(multiplier) || multiplier < 0.1 || multiplier > 5.0) {
    errors.metalComplexityMultiplier = 'Complexity multiplier must be between 0.1 and 5.0';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Filter processes based on criteria
 */
export const filterProcesses = (processes, filters) => {
  if (!processes) return [];

  return processes.filter(process => {
    // Category filter
    if (filters.category && process.category !== filters.category) {
      return false;
    }

    // Skill level filter
    if (filters.skillLevel && process.skillLevel !== filters.skillLevel) {
      return false;
    }

    // Active status filter
    if (filters.isActive !== undefined && process.isActive !== filters.isActive) {
      return false;
    }

    // Metal type filter
    if (filters.metalType && process.metalType !== filters.metalType) {
      return false;
    }

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchableText = [
        process.displayName,
        process.description,
        process.category,
        process.skillLevel,
        process.metalType
      ].join(' ').toLowerCase();

      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  });
};

/**
 * Sort processes by criteria
 */
export const sortProcesses = (processes, sortBy = 'displayName', sortOrder = 'asc') => {
  if (!processes) return [];

  return [...processes].sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    // Handle nested pricing values
    if (sortBy.includes('.')) {
      const keys = sortBy.split('.');
      aValue = keys.reduce((obj, key) => obj?.[key], a);
      bValue = keys.reduce((obj, key) => obj?.[key], b);
    }

    // Handle null/undefined values
    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    // Convert to comparable format
    if (typeof aValue === 'string') aValue = aValue.toLowerCase();
    if (typeof bValue === 'string') bValue = bValue.toLowerCase();

    let comparison = 0;
    if (aValue < bValue) comparison = -1;
    if (aValue > bValue) comparison = 1;

    return sortOrder === 'desc' ? comparison * -1 : comparison;
  });
};

/**
 * Generate process statistics
 */
export const generateProcessStats = (processes) => {
  if (!processes || processes.length === 0) {
    return {
      total: 0,
      active: 0,
      inactive: 0,
      averageLaborHours: 0,
      averageTotalCost: 0,
      totalEstimatedValue: 0,
      categoryCounts: {},
      skillLevelCounts: {},
      metalTypeCounts: {}
    };
  }

  const active = processes.filter(p => p.isActive !== false);
  const inactive = processes.filter(p => p.isActive === false);
  
  const totalLaborHours = processes.reduce((sum, p) => sum + (p.laborHours || 0), 0);
  const totalCost = processes.reduce((sum, p) => sum + (p.pricing?.totalCost || 0), 0);
  
  const categoryCounts = {};
  const skillLevelCounts = {};
  const metalTypeCounts = {};
  
  processes.forEach(process => {
    const category = process.category || 'unknown';
    const skillLevel = process.skillLevel || 'standard';
    const metalType = process.metalType || 'unknown';
    
    categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    skillLevelCounts[skillLevel] = (skillLevelCounts[skillLevel] || 0) + 1;
    metalTypeCounts[metalType] = (metalTypeCounts[metalType] || 0) + 1;
  });

  return {
    total: processes.length,
    active: active.length,
    inactive: inactive.length,
    averageLaborHours: processes.length > 0 ? +(totalLaborHours / processes.length).toFixed(2) : 0,
    averageTotalCost: processes.length > 0 ? +(totalCost / processes.length).toFixed(2) : 0,
    totalEstimatedValue: +totalCost.toFixed(2),
    categoryCounts,
    skillLevelCounts,
    metalTypeCounts
  };
};

/**
 * Transform process for form editing
 */
export const transformProcessForForm = (process) => {
  if (!process) return { ...DEFAULT_PROCESS_FORM };

  return {
    displayName: process.displayName || '',
    category: process.category || '',
    laborHours: process.laborHours || 0,
    skillLevel: process.skillLevel || 'standard',
    metalType: process.metalType || '',
    karat: process.karat || '',
    metalComplexityMultiplier: process.metalComplexityMultiplier || 1.0,
    description: process.description || '',
    materials: process.materials || [],
    isActive: process.isActive !== false
  };
};

/**
 * Get unique values from an array of objects for a specific field
 */
export const getUniqueValues = (array, field) => {
  const values = array.map(item => item[field]).filter(value => value != null);
  return [...new Set(values)].sort();
};

/**
 * Calculate estimated process cost
 */
export const calculateProcessCost = (processData, adminSettings = {}) => {
  // Ensure adminSettings is not null and provide defaults
  const settings = adminSettings || {};
  const baseHourlyRate = parseFloat(settings.baseHourlyRate) || 50;
  const materialMarkupPercent = parseFloat(settings.materialMarkupPercent) || 25;

  const basePrice = parseFloat(processData.basePrice) || 0;
  const laborHours = parseFloat(processData.laborHours) || 0;
  const skillLevel = processData.skillLevel || 'standard';
  const metalComplexityMultiplier = parseFloat(processData.metalComplexityMultiplier) || 1.0;

  // Get skill level multiplier
  const skillLevelMultiplier = getSkillLevelMultiplier(skillLevel);
  
  // Calculate adjusted hourly rate
  const hourlyRate = baseHourlyRate * skillLevelMultiplier * metalComplexityMultiplier;
  
  // Calculate labor cost
  const laborCost = hourlyRate * laborHours;
  
  // Calculate materials cost (if materials are provided)
  const materials = processData.materials || [];
  const baseMaterialsCost = materials.reduce((total, material) => {
    const cost = parseFloat(material.cost) || 0;
    const quantity = parseFloat(material.quantity) || 1;
    return total + (cost * quantity);
  }, 0);
  
  // Apply material markup
  const materialMarkup = baseMaterialsCost * (materialMarkupPercent / 100);
  const materialsCost = baseMaterialsCost + materialMarkup;
  
  // Total cost
  const totalCost = basePrice + laborCost + materialsCost;
  
  // Calculate complexity multiplier for display
  const complexityMultiplier = skillLevelMultiplier * metalComplexityMultiplier;

  return {
    laborCost: Math.round(laborCost * 100) / 100,
    baseMaterialsCost: Math.round(baseMaterialsCost * 100) / 100,
    materialsCost: Math.round(materialsCost * 100) / 100,
    materialMarkup,
    totalCost: Math.round(totalCost * 100) / 100,
    hourlyRate: Math.round(hourlyRate * 100) / 100,
    complexityMultiplier,
    calculatedAt: new Date()
  };
};