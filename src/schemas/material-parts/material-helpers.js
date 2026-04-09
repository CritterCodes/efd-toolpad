export const MaterialHelpers = {
  // Get cost for specific metal/karat combination
  getCost: (material, metalType = null, karat = null) => {
    if (!material.hasVariants) {
      return material.unitCost || 0;
    }
    
    if (!metalType || !karat) {
      throw new Error('Metal type and karat required for variant materials');
    }
    
    const variant = material.variants.find(v => 
      v.metalType === metalType && v.karat === karat && v.isActive
    );
    
    return variant?.unitCost || 0;
  },
  
  // Get all available metal/karat combinations
  getAvailableCombinations: (material) => {
    if (!material.hasVariants) {
      return material.metalType && material.karat 
        ? [{ metalType: material.metalType, karat: material.karat }]
        : [];
    }
    
    return material.variants
      .filter(v => v.isActive)
      .map(v => ({ metalType: v.metalType, karat: v.karat }));
  },
  
  // Convert legacy material to variant structure
  convertToVariant: (legacyMaterial) => {
    if (legacyMaterial.hasVariants) {
      return legacyMaterial; // Already converted
    }
    
    const variant = {
      metalType: legacyMaterial.metalType || 'other',
      karat: legacyMaterial.karat || 'na',
      sku: legacyMaterial.sku || '',
      unitCost: legacyMaterial.unitCost || 0,
      stullerProductId: legacyMaterial.stullerProductId || '',
      compatibleMetals: legacyMaterial.compatibleMetals || [],
      isActive: true,
      lastUpdated: new Date(),
      notes: ''
    };
    
    return {
      ...legacyMaterial,
      hasVariants: true,
      variants: [variant],
      // Clear legacy fields
      unitCost: null,
      sku: null,
      stullerProductId: null,
      metalType: null,
      karat: null
    };
  },
  
  // Get display name with variant info
  getDisplayName: (material, metalType = null, karat = null) => {
    if (!material.hasVariants) {
      return material.displayName;
    }
    
    if (!metalType || !karat) {
      return `${material.displayName} (Multi-Variant)`;
    }
    
    return `${material.displayName} (${metalType.toUpperCase()} ${karat.toUpperCase()})`;
  }
};

export default EnhancedMaterialSchema;
