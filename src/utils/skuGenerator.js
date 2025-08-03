/**
 * SKU Generation Utilities
 * Generates unique identifiers for tasks, processes, and materials
 */

/**
 * Generate SKU for tasks using shortCode system
 * Format: RT-{CategoryName}-{shortCode}
 * Example: RT-SHANK-02201
 */
export function generateTaskSku(category, shortCode) {
  const categoryNameMap = {
    'shank': 'SHANK',
    'prongs': 'PRONG', 
    'stone_setting': 'STONE',
    'engraving': 'ENGRAVE',
    'chains': 'CHAIN',
    'bracelet': 'BRACELET',
    'watch': 'WATCH',
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
 * Generate a 5-digit shortCode following the specification: [Category][Karat][Metal][Task]
 * @param {string} category - The task category (shank, prongs, stone_setting, etc.)
 * @param {string} metalType - The metal type (silver, yellow_gold, white_gold, etc.)
 * @param {string} karat - The karat/purity (925_silver, 14k, 18k, etc.)
 * @param {number} taskNumber - Optional specific task number (01-99)
 */
export function generateShortCode(category, metalType = 'not_applicable', karat = 'not_applicable', taskNumber = null) {
  // Category mapping (Position 1: 0-7)
  const categoryMap = {
    'shank': '0',
    'prongs': '1', 
    'stone_setting': '2',
    'engraving': '3',
    'chains': '4',
    'bracelet': '5',
    'watch': '6',
    'misc': '7'
  };

  // Karat mapping (Position 2: 0-9)
  const karatMap = {
    'not_applicable': '0',
    'mixed': '0',
    '925_silver': '1',
    '14k': '2',
    '18k': '3', 
    '22k': '4',
    '24k': '5',
    '10k': '6',
    'platinum_950': '7',
    'platinum_900': '8',
    'other': '9'
  };

  // Metal Type mapping (Position 3: 0-9)
  const metalTypeMap = {
    'not_applicable': '0',
    'mixed': '0',
    'silver': '1',
    'yellow_gold': '2',
    'white_gold': '3',
    'rose_gold': '4',
    'platinum': '5',
    'palladium': '6',
    'stainless_steel': '7',
    'titanium': '8',
    'other': '9'
  };

  const categoryCode = categoryMap[category.toLowerCase()] || '7';
  const karatCode = karatMap[karat.toLowerCase()] || '0';
  const metalCode = metalTypeMap[metalType.toLowerCase()] || '0';
  
  // Task code (Positions 4-5: 01-99)
  let taskCode = '01'; // Default
  
  if (taskNumber) {
    taskCode = taskNumber.toString().padStart(2, '0');
  } else {
    // Generate default task codes based on category
    const defaultTaskCodes = {
      'shank': '01', // Size Down (1 size)
      'prongs': '10', // Basic Prong Repair
      'stone_setting': '20', // Basic Stone Setting
      'engraving': '30', // Hand Engraving
      'chains': '40', // Chain Link Repair
      'bracelet': '50', // Bracelet Sizing
      'watch': '60', // Battery Replacement
      'misc': '70' // General Cleaning
    };
    taskCode = defaultTaskCodes[category.toLowerCase()] || '01';
  }

  return `${categoryCode}${karatCode}${metalCode}${taskCode}`;
}

/**
 * Parse a shortCode into its components
 * @param {string} shortCode - 5-digit shortCode
 */
export function parseShortCode(shortCode) {
  if (!shortCode || shortCode.length !== 5) {
    return null;
  }

  const categoryCode = shortCode.charAt(0);
  const karatCode = shortCode.charAt(1);
  const metalCode = shortCode.charAt(2);
  const taskCode = shortCode.substring(3);

  return {
    categoryCode,
    karatCode,
    metalCode,
    taskCode: parseInt(taskCode),
    rawTaskCode: taskCode
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
