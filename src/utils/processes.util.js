/**
 * Processes Utilities
 * Constants, formatters, and helper functions for repair processes
 * 
 * @deprecated calculateProcessCost() is deprecated in favor of PricingEngine
 */

import pricingEngine from '@/services/PricingEngine';
import { SKILL_LEVEL, SKILL_LEVEL_MULTIPLIERS, DEFAULT_SKILL_LEVEL } from '@/constants/pricing.constants.mjs';

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

// Skill Levels - Uses constants from pricing.constants.mjs for consistency
// This ensures single source of truth for skill level values
export const SKILL_LEVELS = [
  { value: SKILL_LEVEL.BASIC, label: 'Basic', multiplier: SKILL_LEVEL_MULTIPLIERS[SKILL_LEVEL.BASIC] },
  { value: SKILL_LEVEL.STANDARD, label: 'Standard', multiplier: SKILL_LEVEL_MULTIPLIERS[SKILL_LEVEL.STANDARD] },
  { value: SKILL_LEVEL.ADVANCED, label: 'Advanced', multiplier: SKILL_LEVEL_MULTIPLIERS[SKILL_LEVEL.ADVANCED] },
  { value: SKILL_LEVEL.EXPERT, label: 'Expert', multiplier: SKILL_LEVEL_MULTIPLIERS[SKILL_LEVEL.EXPERT] }
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
  skillLevel: DEFAULT_SKILL_LEVEL,
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
 * Parse metal keys like "Sterling Silver 925" into structured data
 * @param {string} metalKey - The metal key to parse
 * @returns {object|null} Parsed metal data or null if invalid
 */
export const parseMetalKey = (metalKey) => {
  if (!metalKey || typeof metalKey !== 'string') return null;
  
  // Common metal type mappings
  const metalMappings = {
    'sterling silver': 'sterling_silver',
    'yellow gold': 'yellow_gold',
    'white gold': 'white_gold',
    'rose gold': 'rose_gold',
    'platinum': 'platinum'
  };
  
  // Extract karat/purity (look for patterns like 10K, 14K, 18K, 925, 950, etc.)
  const karatMatch = metalKey.match(/(\d+K?|\d{3})/i);
  const karat = karatMatch ? karatMatch[1].toUpperCase() : 'standard';
  
  // Find metal type by checking each mapping
  for (const [displayName, metalValue] of Object.entries(metalMappings)) {
    if (metalKey.toLowerCase().includes(displayName)) {
      return {
        metalType: metalValue,
        karat: karat,
        metalLabel: metalKey
      };
    }
  }
  
  return null;
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
/**
 * Prepare process data with calculated prices for saving
 * @param {Object} formData - Process form data
 * @param {Object} adminSettings - Admin settings
 * @param {Array} availableMaterials - Array of all available materials
 * @returns {Object} Process data ready for saving
 */
export const prepareProcessForSaving = (formData, adminSettings, availableMaterials = []) => {
  const costPreview = calculateProcessCost(formData, adminSettings, availableMaterials);
  
  // Enrich materials with full data from availableMaterials
  const enrichedMaterials = (formData.materials || []).map(material => {
    const fullMaterial = availableMaterials.find(m => 
      m.sku === material.materialSku || m._id === material.materialId
    );
    
    if (!fullMaterial) return material;
    
    return {
      ...material,
      materialName: fullMaterial.displayName || fullMaterial.name,
      stullerProducts: fullMaterial.stullerProducts || [],
      portionsPerUnit: fullMaterial.portionsPerUnit || 1,
      baseCostPerPortion: material.estimatedCost / material.quantity || 0,
      estimatedCost: material.estimatedCost || 0,
      isMetalDependent: fullMaterial.isMetalDependent || false,
      metalTypes: fullMaterial.stullerProducts ? 
        [...new Set(fullMaterial.stullerProducts.map(p => p.metalType).filter(Boolean))] : []
    };
  });

  const processData = {
    displayName: formData.displayName,
    category: formData.category,
    laborHours: parseFloat(formData.laborHours) || 0,
    skillLevel: formData.skillLevel,
    description: formData.description,
    materials: enrichedMaterials,
    isActive: formData.isActive !== false,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Create the new pricing structure
  if (costPreview) {
    const baseHourlyRate = adminSettings.laborRates?.baseRate || 40;
    const skillMultiplier = getSkillLevelMultiplier(formData.skillLevel);
    const hourlyRate = baseHourlyRate * skillMultiplier;
    const laborCost = (parseFloat(formData.laborHours) || 0) * hourlyRate;
    const materialMarkup = parseFloat(adminSettings.materialMarkup) || 2.0;
    
    // Calculate base materials cost (lowest cost variant)
    const baseMaterialsCost = costPreview.summary?.baseMaterialsCost || 0;
    
    if (costPreview.isMetalDependent && costPreview.metalPrices) {
      // Metal-dependent process: create costs per metal/karat combination
      const materialsCost = {};
      const totalCost = {};
      
      Object.entries(costPreview.metalPrices).forEach(([variantKey, prices]) => {
        const metalLabel = prices.metalLabel || variantKey;
        materialsCost[metalLabel] = prices.materialsCost;
        totalCost[metalLabel] = prices.totalCost;
      });
      
      processData.pricing = {
        laborCost,
        baseMaterialsCost,
        materialsCost,
        materialMarkup,
        totalCost,
        hourlyRate,
        calculatedAt: new Date()
      };
    } else {
      // Universal process: single pricing
      const materialsCost = baseMaterialsCost * materialMarkup;
      const totalCostValue = laborCost + materialsCost;
      
      processData.pricing = {
        laborCost,
        baseMaterialsCost,
        materialsCost: { "universal": materialsCost },
        materialMarkup,
        totalCost: { "universal": totalCostValue },
        hourlyRate,
        calculatedAt: new Date()
      };
    }
  }

  return processData;
};

export const transformProcessForForm = (process) => {
  if (!process) return { ...DEFAULT_PROCESS_FORM };

  return {
    displayName: process.displayName || '',
    category: process.category || '',
    laborHours: process.laborHours || 0,
    skillLevel: process.skillLevel || 'standard',
    description: process.description || '',
    materials: process.materials || [],
    isActive: process.isActive !== false
  };
};

/**
 * Get unique values from processes for filter options
 * @param {Array} processes - Array of processes
 * @param {string} field - Field to extract unique values from
 * @returns {Array} Unique values
 */
export const getUniqueValues = (processes, field) => {
  if (!Array.isArray(processes)) {
    return [];
  }
  
  const values = processes
    .map(process => process[field])
    .filter(value => value != null && value !== '');
  
  return [...new Set(values)].sort();
};

/**
 * Get unique metal type + karat combinations from process materials
 * @param {Array} materials - Array of materials used in the process
 * @param {Array} availableMaterials - Array of all available materials with full data
 * @returns {Array} Array of unique metal type + karat combinations found in materials
 */
export const getMetalVariantsFromMaterials = (materials, availableMaterials) => {
  const metalVariants = new Map(); // Use Map to store full variant objects
  
  materials.forEach(material => {
    // Find the full material data
    const fullMaterial = availableMaterials.find(m => 
      m.sku === material.materialSku || m._id === material.materialId
    );
    
    if (!fullMaterial) return;
    
    // Check if material has stullerProducts (metal-dependent materials)
    if (fullMaterial.stullerProducts && Array.isArray(fullMaterial.stullerProducts)) {
      fullMaterial.stullerProducts.forEach(product => {
        if (product.metalType) {
          const variantKey = `${product.metalType}_${product.karat || 'standard'}`;
          metalVariants.set(variantKey, {
            metalType: product.metalType,
            karat: product.karat || 'standard'
          });
        }
      });
    }
    
    // Check legacy materials with compatibleMetals (treat as standard variants)
    else if (fullMaterial.compatibleMetals && Array.isArray(fullMaterial.compatibleMetals)) {
      fullMaterial.compatibleMetals.forEach(metalType => {
        const variantKey = `${metalType}_standard`;
        metalVariants.set(variantKey, {
          metalType: metalType,
          karat: 'standard'
        });
      });
    }
  });
  
  const variants = Array.from(metalVariants.values());
  return variants;
};

/**
 * Get unique metal types from process materials
 * @param {Array} materials - Array of materials used in the process
 * @param {Array} availableMaterials - Array of all available materials with full data
 * @returns {Array} Array of unique metal types found in materials
 */
export const getMetalTypesFromMaterials = (materials, availableMaterials) => {
  const metalTypes = new Set();
  
  materials.forEach(material => {
    // Find the full material data
    const fullMaterial = availableMaterials.find(m => 
      m.sku === material.materialSku || m._id === material.materialId
    );
    
    if (!fullMaterial) return;
    
    // Check if material has stullerProducts (indicates metal-dependent)
    if (fullMaterial.stullerProducts && Array.isArray(fullMaterial.stullerProducts)) {
      fullMaterial.stullerProducts.forEach(product => {
        if (product.metalType) {
          metalTypes.add(product.metalType);
        }
      });
    }
    
    // Check legacy materials with compatibleMetals
    else if (fullMaterial.compatibleMetals && Array.isArray(fullMaterial.compatibleMetals)) {
      fullMaterial.compatibleMetals.forEach(metalType => {
        metalTypes.add(metalType);
      });
    }
  });
  
  return Array.from(metalTypes);
};

/**
 * Check if process should be metal dependent based on its materials
 * @param {Array} materials - Array of materials used in the process
 * @param {Array} availableMaterials - Array of all available materials with full data
 * @returns {boolean} True if any material is metal dependent
 */
export const shouldProcessBeMetalDependent = (materials, availableMaterials) => {
  return materials.some(material => {
    const fullMaterial = availableMaterials.find(m => 
      m.sku === material.materialSku || m._id === material.materialId
    );
    
    if (!fullMaterial) return false;
    
    // If material has explicit isMetalDependent flag, respect it
    if (fullMaterial.hasOwnProperty('isMetalDependent')) {
      return Boolean(fullMaterial.isMetalDependent);
    }
    
    // If material has stullerProducts, it's metal dependent
    if (fullMaterial.stullerProducts && Array.isArray(fullMaterial.stullerProducts) && fullMaterial.stullerProducts.length > 0) {
      return true;
    }
    
    // If material has compatibleMetals, it's metal dependent
    if (fullMaterial.compatibleMetals && Array.isArray(fullMaterial.compatibleMetals) && fullMaterial.compatibleMetals.length > 0) {
      return true;
    }
    
    // Default to false if we can't determine metal dependency
    return false;
  });
};

/**
 * Calculate process cost for all relevant metal types based on materials
 * 
 * @deprecated This function is deprecated. Use PricingEngine.calculateProcessCost() instead.
 * This function now calls PricingEngine internally for backward compatibility.
 * 
 * @param {Object} formData - Process form data
 * @param {Object} adminSettings - Admin settings for labor rates and metal multipliers
 * @param {Array} availableMaterials - Array of all available materials with full data
 * @returns {Object} Cost breakdown for each relevant metal type
 */
export const calculateProcessCost = (formData, adminSettings, availableMaterials = []) => {
  console.warn('⚠️ DEPRECATED: calculateProcessCost() - Please migrate to PricingEngine.calculateProcessCost()');
  
  // Use PricingEngine for consistent calculations
  if (!adminSettings || !formData.laborHours || !formData.skillLevel) {
    return null;
  }
  
  return pricingEngine.calculateProcessCost(formData, adminSettings);
};
