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