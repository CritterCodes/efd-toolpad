/**
 * Enhanced Material Schema with Multi-Variant Support
 * Supports both traditional single materials and new multi-variant materials
 */

export const MaterialVariantSchema = {
  metalType: {
    type: String,
    required: true,
    enum: ['gold', 'silver', 'platinum', 'palladium', 'stainless', 'mixed', 'other']
  },
  karat: {
    type: String,
    required: true,
    // Will be validated based on metalType
  },
  sku: {
    type: String,
    required: false
  },
  unitCost: {
    type: Number,
    required: true,
    min: 0
  },
  stullerProductId: {
    type: String,
    required: false
  },
  compatibleMetals: [{
    type: String,
    enum: ['gold', 'silver', 'platinum', 'palladium', 'stainless', 'mixed', 'other']
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    required: false
  }
};

export const EnhancedMaterialSchema = {
  // Core Material Info
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      'solder',
      'wire',
      'sheet',
      'findings',
      'stones',
      'consumable',
      'tools',
      'sizing_material',
      'prong_material',
      'setting_material',
      'polishing_material',
      'cleaning_material',
      'other'
    ]
  },
  unitType: {
    type: String,
    required: true,
    enum: [
      'piece',
      'gram',
      'ounce',
      'pennyweight',
      'inch',
      'foot',
      'application',
      'millimeter',
      'centimeter',
      'carat',
      'each'
    ]
  },
  supplier: {
    type: String,
    required: true,
    enum: ['Stuller', 'Rio Grande', 'Gesswein', 'Local', 'Other']
  },
  description: {
    type: String,
    required: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  autoUpdate: {
    type: Boolean,
    default: false
  },
  
  // Multi-Variant Support
  hasVariants: {
    type: Boolean,
    default: false
  },
  variants: {
    type: [MaterialVariantSchema],
    required: false,
    default: []
  },
  
  // Legacy Support (for single materials)
  unitCost: {
    type: Number,
    required: false, // null when hasVariants = true
    min: 0
  },
  sku: {
    type: String,
    required: false // null when hasVariants = true
  },
  stullerProductId: {
    type: String,
    required: false // null when hasVariants = true
  },
  metalType: {
    type: String,
    required: false, // null when hasVariants = true
    enum: ['gold', 'silver', 'platinum', 'palladium', 'stainless', 'mixed', 'other']
  },
  karat: {
    type: String,
    required: false // null when hasVariants = true
  },
  compatibleMetals: [{
    type: String,
    enum: ['gold', 'silver', 'platinum', 'palladium', 'stainless', 'mixed', 'other']
  }],
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: String,
    required: false
  },
  updatedBy: {
    type: String,
    required: false
  }
};

/**
 * Validation Rules
 */
export const MaterialValidation = {
  // Core validation
  validateRequired: (material) => {
    const required = ['name', 'displayName', 'category', 'unitType', 'supplier'];
    const missing = required.filter(field => !material[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
  },
  
  // Variant-specific validation
  validateVariants: (material) => {
    if (material.hasVariants) {
      if (!material.variants || material.variants.length === 0) {
        throw new Error('Materials with variants must have at least one variant');
      }
      
      // Ensure legacy fields are null
      if (material.unitCost !== null || material.sku || material.stullerProductId) {
        throw new Error('Materials with variants cannot have legacy pricing fields');
      }
      
      // Validate each variant
      material.variants.forEach((variant, index) => {
        if (!variant.metalType || !variant.karat || variant.unitCost === undefined) {
          throw new Error(`Variant ${index + 1} is missing required fields`);
        }
        
        if (variant.unitCost < 0) {
          throw new Error(`Variant ${index + 1} cannot have negative cost`);
        }
      });
    } else {
      // Single material validation
      if (material.unitCost === undefined || material.unitCost === null) {
        throw new Error('Single materials must have unitCost');
      }
      
      if (material.variants && material.variants.length > 0) {
        throw new Error('Single materials cannot have variants');
      }
    }
  },
  
  // Karat validation based on metal type
  validateKarat: (metalType, karat) => {
    const validKarats = {
      gold: ['10k', '14k', '18k', '24k'],
      silver: ['sterling', 'fine', '925', '999'],
      platinum: ['950', '900', 'iridium'],
      palladium: ['950', '500'],
      stainless: ['316l', '304'],
      mixed: ['various'],
      other: ['na']
    };
    
    if (!validKarats[metalType] || !validKarats[metalType].includes(karat)) {
      throw new Error(`Invalid karat '${karat}' for metal type '${metalType}'`);
    }
  },
  
  // Complete validation
  validate: (material) => {
    MaterialValidation.validateRequired(material);
    MaterialValidation.validateVariants(material);
    
    // Validate karats for variants
    if (material.hasVariants) {
      material.variants.forEach((variant, index) => {
        try {
          MaterialValidation.validateKarat(variant.metalType, variant.karat);
        } catch (error) {
          throw new Error(`Variant ${index + 1}: ${error.message}`);
        }
      });
    } else if (material.metalType && material.karat) {
      MaterialValidation.validateKarat(material.metalType, material.karat);
    }
  }
};

/**
 * Helper Functions
 */
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
