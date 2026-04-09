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
