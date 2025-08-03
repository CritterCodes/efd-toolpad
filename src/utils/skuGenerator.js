/**
 * SKU Generation Utilities
 * Generates unique identifiers for tasks, processes, and materials
 */

/**
 * Generate SKU for tasks
 * Format: RT-{CategoryPrefix}-{MetalPrefix}{RandomNumber}
 * Example: RT-RE-G123
 */
export function generateTaskSku(category, metalType = 'general') {
  const categoryPrefix = category.substring(0, 2).toUpperCase();
  const metalPrefix = metalType ? metalType.substring(0, 1).toUpperCase() : 'G';
  const randomSuffix = Math.floor(Math.random() * 900) + 100;
  return `RT-${categoryPrefix}-${metalPrefix}${randomSuffix}`;
}

/**
 * Generate SKU for processes
 * Format: PR-{CategoryPrefix}-{SkillPrefix}{RandomNumber}
 * Example: PR-RE-S123 (Process - Repair - Standard + random number)
 */
export function generateProcessSku(category, skillLevel = 'standard') {
  const categoryPrefix = category.substring(0, 2).toUpperCase();
  const skillPrefix = getSkillPrefix(skillLevel);
  const randomSuffix = Math.floor(Math.random() * 900) + 100;
  return `PR-${categoryPrefix}-${skillPrefix}${randomSuffix}`;
}

/**
 * Generate SKU for materials
 * Format: MT-{CategoryPrefix}-{TypePrefix}{RandomNumber}
 * Example: MT-ME-S123 (Material - Metal - Silver + random number)
 */
export function generateMaterialSku(category, materialType = 'general') {
  const categoryPrefix = category.substring(0, 2).toUpperCase();
  const typePrefix = getMaterialTypePrefix(materialType, category);
  const randomSuffix = Math.floor(Math.random() * 900) + 100;
  return `MT-${categoryPrefix}-${typePrefix}${randomSuffix}`;
}

/**
 * Get skill level prefix for processes
 */
function getSkillPrefix(skillLevel) {
  const skillMap = {
    'basic': 'B',
    'standard': 'S',
    'advanced': 'A',
    'expert': 'E',
    'master': 'M'
  };
  return skillMap[skillLevel.toLowerCase()] || 'S';
}

/**
 * Get material type prefix based on category and material type
 */
function getMaterialTypePrefix(materialType, category) {
  // Common material type mappings
  const typeMap = {
    // Metals
    'silver': 'S',
    'gold': 'G',
    'platinum': 'P',
    'copper': 'C',
    'brass': 'B',
    'steel': 'T',
    
    // Tools
    'cutting': 'C',
    'polishing': 'P',
    'finishing': 'F',
    'measuring': 'M',
    
    // Supplies
    'adhesive': 'A',
    'solvent': 'S',
    'lubricant': 'L',
    'consumable': 'C',
    
    // Default
    'general': 'G'
  };
  
  return typeMap[materialType.toLowerCase()] || 'G';
}

/**
 * Generate a simple code without prefixes (for task codes)
 */
export function generateTaskCode(category) {
  const categoryPrefix = category.substring(0, 2).toUpperCase();
  const randomSuffix = Math.floor(Math.random() * 900) + 100;
  return `${categoryPrefix}${randomSuffix}`;
}

/**
 * Validate SKU format
 */
export function validateSku(sku, type = 'task') {
  const patterns = {
    task: /^RT-[A-Z]{2}-[A-Z]\d{3}$/,
    process: /^PR-[A-Z]{2}-[A-Z]\d{3}$/,
    material: /^MT-[A-Z]{2}-[A-Z]\d{3}$/
  };
  
  return patterns[type]?.test(sku) || false;
}
