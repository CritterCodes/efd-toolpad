/**
 * Material Schema for Stuller Products Structure
 * Each material has general info + array of Stuller products with different metal types/karats
 */

export const MaterialSchema = {
  // General Material Information
  name: String, // e.g., "hard_solder_sheet"
  displayName: String, // e.g., "Hard Solder Sheet"
  category: String, // e.g., "solder"
  description: String,
  unitType: String, // e.g., "sheet"
  portionsPerUnit: Number, // e.g., 1
  portionType: String, // e.g., "piece"
  supplier: String, // e.g., "Stuller"
  isActive: Boolean,
  
  // Stuller Products Array - Each entry is a different metal type/karat combination
  stullerProducts: [
    {
      id: String, // Unique identifier for this product entry
      stullerItemNumber: String, // e.g., "SOLDER:77433:P"
      metalType: String, // e.g., "gold", "silver", "platinum"
      karat: String, // e.g., "14k", "18k", "sterling"
      
      // Pricing Information
      stullerPrice: Number, // Raw price from Stuller
      markupRate: Number, // Markup multiplier (e.g., 1.5 for 50% markup)
      markedUpPrice: Number, // stullerPrice * markupRate
      unitCost: Number, // Final price (same as markedUpPrice for compatibility)
      
      sku: String, // SKU for this specific variant
      description: String, // Product-specific description
      weight: Number, // Product weight if applicable
      dimensions: String, // Product dimensions if applicable
      addedAt: Date, // When this product was added
      lastUpdated: Date, // Last price/info update
      autoUpdatePricing: Boolean // Whether to auto-update from Stuller
    }
  ],
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  createdBy: String,
  updatedBy: String
};

/**
 * Material Data Validation
 */
export const MaterialValidation = {
  validateGeneral: (formData) => {
    const errors = [];
    
    if (!formData.name?.trim()) {
      errors.push('Material name is required');
    }
    
    if (!formData.category) {
      errors.push('Category is required');
    }
    
    if (!formData.unitType) {
      errors.push('Unit type is required');
    }
    
    if (!formData.portionsPerUnit || formData.portionsPerUnit < 1) {
      errors.push('Portions per unit must be at least 1');
    }
    
    return errors;
  },
  
  validateStullerProduct: (product) => {
    const errors = [];
    
    if (!product.stullerItemNumber?.trim()) {
      errors.push('Stuller item number is required');
    }
    
    if (!product.metalType) {
      errors.push('Metal type is required');
    }
    
    if (!product.karat) {
      errors.push('Karat is required');
    }
    
    if (product.unitCost < 0) {
      errors.push('Unit cost cannot be negative');
    }
    
    return errors;
  },
  
  validateComplete: (formData) => {
    const generalErrors = MaterialValidation.validateGeneral(formData);
    
    // At least one Stuller product should be present for a complete material
    if (!formData.stullerProducts || formData.stullerProducts.length === 0) {
      generalErrors.push('At least one Stuller product is required');
    }
    
    // Validate each Stuller product
    const productErrors = [];
    formData.stullerProducts?.forEach((product, index) => {
      const errors = MaterialValidation.validateStullerProduct(product);
      if (errors.length > 0) {
        productErrors.push(`Product ${index + 1}: ${errors.join(', ')}`);
      }
    });
    
    return [...generalErrors, ...productErrors];
  }
};

/**
 * Material Helper Functions
 */
export const MaterialHelpers = {
  /**
   * Calculate price for specific metal type and karat
   */
  getPriceForMetalKarat: (material, metalType, karat) => {
    const product = material.stullerProducts?.find(p => 
      p.metalType === metalType && p.karat === karat
    );
    return product?.unitCost || null;
  },
  
  /**
   * Get all available metal types for this material
   */
  getAvailableMetalTypes: (material) => {
    return [...new Set(material.stullerProducts?.map(p => p.metalType) || [])];
  },
  
  /**
   * Get available karats for a specific metal type
   */
  getAvailableKarats: (material, metalType) => {
    return material.stullerProducts
      ?.filter(p => p.metalType === metalType)
      ?.map(p => p.karat) || [];
  },
  
  /**
   * Create a new Stuller product entry
   */
  createStullerProduct: (stullerData) => {
    return {
      id: Date.now().toString(),
      stullerItemNumber: stullerData.stullerItemNumber || '',
      metalType: stullerData.metalType || 'gold',
      karat: stullerData.karat || '14k',
      unitCost: stullerData.unitCost || 0,
      sku: stullerData.sku || '',
      description: stullerData.description || '',
      weight: stullerData.weight || 0,
      dimensions: stullerData.dimensions || '',
      addedAt: new Date(),
      lastUpdated: new Date(),
      autoUpdatePricing: true
    };
  },
  
  /**
   * Convert legacy material to new structure
   */
  convertFromLegacy: (legacyMaterial) => {
    return {
      // General info
      name: legacyMaterial.name,
      displayName: legacyMaterial.displayName,
      category: legacyMaterial.category,
      description: legacyMaterial.description,
      unitType: legacyMaterial.unitType,
      portionsPerUnit: legacyMaterial.portionsPerUnit || 1,
      portionType: legacyMaterial.portionType || 'piece',
      supplier: legacyMaterial.supplier || 'Stuller',
      isActive: legacyMaterial.isActive !== false,
      
      // Convert single product to Stuller products array
      stullerProducts: legacyMaterial.stuller_item_number ? [
        {
          id: '1',
          stullerItemNumber: legacyMaterial.stuller_item_number,
          metalType: legacyMaterial.metalType || 'gold',
          karat: legacyMaterial.karat || '14k',
          unitCost: legacyMaterial.unitCost || 0,
          sku: legacyMaterial.sku || '',
          description: legacyMaterial.description || '',
          addedAt: new Date(),
          lastUpdated: new Date(),
          autoUpdatePricing: legacyMaterial.auto_update_pricing !== false
        }
      ] : [],
      
      // Metadata
      createdAt: legacyMaterial.createdAt || new Date(),
      updatedAt: new Date(),
      createdBy: legacyMaterial.createdBy,
      updatedBy: legacyMaterial.updatedBy
    };
  }
};
