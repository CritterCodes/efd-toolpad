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
  
  return Array.from(metalVariants.values());};

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
