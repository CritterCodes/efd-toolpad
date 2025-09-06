/**
 * SKU Generator Utilities
 * Generates unique identifiers for tasks, processes, and materials
 */

/**
 * Generate SKU for tasks using shortCode system
 * Format: RT-{CategoryName}-{shortCode}
 * Example: RT-REPAIR-01234
 */
export function generateTaskSku(category, shortCode) {
  const categoryNameMap = {
    'ring_sizing': 'RSIZ',
    'stone_setting': 'STON', 
    'repair': 'REPR',
    'chain_repair': 'CHAI',
    'cleaning': 'CLEA',
    'polishing': 'POLI',
    'soldering': 'SOLD',
    'casting': 'CAST',
    'engraving': 'ENGR',
    'plating': 'PLAT',
    'custom_work': 'CUST',
    'appraisal': 'APPR',
    'misc': 'MISC'
  };

  const categoryName = categoryNameMap[category.toLowerCase()] || 'MISC';
  return `RT-${categoryName}-${shortCode}`;
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
 * Generate a shortCode based only on category (since metal type/karat are determined by the repair job)
 * @param {string} category - The task category
 * @param {number} taskNumber - Optional specific task number
 */
export function generateShortCode(category, taskNumber = null) {
  // Category mapping
  const categoryMap = {
    'ring_sizing': '0',
    'stone_setting': '1', 
    'repair': '2',
    'chain_repair': '3',
    'cleaning': '4',
    'polishing': '5',
    'soldering': '6',
    'casting': '7',
    'engraving': '8',
    'plating': '9',
    'custom_work': 'C',
    'appraisal': 'A',
    'misc': 'M'
  };

  const categoryCode = categoryMap[category.toLowerCase()] || 'M';
  
  // Generate 4-digit task number
  const finalTaskNumber = taskNumber ? 
    taskNumber.toString().padStart(4, '0') : 
    Math.floor(Math.random() * 9000 + 1000);
  
  return `${categoryCode}${finalTaskNumber}`;
}

/**
 * Parse a shortCode into its components
 * @param {string} shortCode - Category code + 4-digit number (e.g., "01234")
 */
export function parseShortCode(shortCode) {
  if (!shortCode || shortCode.length !== 5) {
    return null;
  }

  const categoryCode = shortCode.charAt(0);
  const taskNumber = shortCode.substring(1);

  return {
    categoryCode,
    taskNumber: parseInt(taskNumber),
    rawTaskNumber: taskNumber
  };
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
