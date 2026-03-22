import { 
  KARAT_OPTIONS, 
  SKILL_LEVELS, 
  METAL_TYPES, 
  COMPLEXITY_MULTIPLIERS 
} from '@/constants/processes.constants';

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
