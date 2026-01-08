/**
 * Material Data Converter
 * Converts between legacy and multi-variant material formats
 * Specifically handles your current material structure
 */

export class MaterialDataConverter {
  /**
   * Convert your current material format to the new multi-variant schema
   * @param {Object} legacyMaterial - Your current material object
   * @returns {Object} - Converted material in new format
   */
  static convertLegacyToVariant(legacyMaterial) {
    // Extract metal type from compatibleMetals array
    const metalType = this.extractMetalType(legacyMaterial.compatibleMetals);
    
    // Clean up karat format
    const karat = this.normalizeKarat(legacyMaterial.karat);
    
    // Create the base material
    const convertedMaterial = {
      _id: legacyMaterial._id,
      name: this.generateBaseName(legacyMaterial.name),
      displayName: this.generateBaseDisplayName(legacyMaterial.displayName),
      category: legacyMaterial.category,
      unitType: legacyMaterial.unitType,
      supplier: legacyMaterial.supplier,
      description: legacyMaterial.description,
      isActive: legacyMaterial.isActive,
      autoUpdate: legacyMaterial.auto_update_pricing || false,
      
      // Multi-variant structure
      hasVariants: true,
      variants: [{
        metalType: metalType,
        karat: karat,
        sku: legacyMaterial.sku,
        unitCost: legacyMaterial.unitCost,
        stullerProductId: legacyMaterial.stuller_item_number,
        compatibleMetals: [metalType],
        isActive: legacyMaterial.isActive,
        lastUpdated: legacyMaterial.last_price_update || new Date(),
        notes: this.generateVariantNotes(legacyMaterial)
      }],
      
      // Clear legacy fields (set to null for variant materials)
      unitCost: null,
      sku: null,
      stullerProductId: null,
      metalType: null,
      karat: null,
      
      // Preserve metadata
      createdAt: legacyMaterial.createdAt,
      updatedAt: legacyMaterial.updatedAt || new Date(),
      createdBy: legacyMaterial.createdBy
    };
    
    return convertedMaterial;
  }

  /**
   * Extract metal type from your compatibleMetals array
   */
  static extractMetalType(compatibleMetals) {
    if (!compatibleMetals || compatibleMetals.length === 0) {
      return 'other';
    }
    
    const metalMap = {
      'yellow_gold': 'gold',
      'white_gold': 'gold', 
      'rose_gold': 'gold',
      'gold': 'gold',
      'sterling_silver': 'silver',
      'silver': 'silver',
      'platinum': 'platinum',
      'palladium': 'palladium',
      'stainless_steel': 'stainless'
    };
    
    const firstMetal = compatibleMetals[0].toLowerCase();
    return metalMap[firstMetal] || 'other';
  }

  /**
   * Normalize karat format to match our schema
   */
  static normalizeKarat(karat) {
    if (!karat) return 'na';
    
    const karatStr = karat.toString().toLowerCase();
    
    // Handle common karat formats
    const karatMap = {
      '10k': '10k',
      '14k': '14k', 
      '18k': '18k',
      '24k': '24k',
      'sterling': '925',
      '925': '925',
      '999': 'fine',
      'fine': 'fine',
      '950': '950',
      '900': '900'
    };
    
    return karatMap[karatStr] || karatStr;
  }

  /**
   * Generate base name by removing metal/karat specifics
   */
  static generateBaseName(originalName) {
    return originalName
      .replace(/14k_|18k_|10k_|24k_/gi, '')
      .replace(/yellow_|white_|rose_/gi, '')
      .replace(/sterling_/gi, '')
      .replace(/^gold_|^silver_|^platinum_/gi, '');
  }

  /**
   * Generate base display name
   */
  static generateBaseDisplayName(originalDisplayName) {
    return originalDisplayName
      .replace(/\b14K\s|18K\s|10K\s|24K\s/gi, '')
      .replace(/\bYellow\s|White\s|Rose\s/gi, '')
      .replace(/\bSterling\s/gi, '')
      .trim();
  }

  /**
   * Generate notes for the variant based on additional properties
   */
  static generateVariantNotes(legacyMaterial) {
    const notes = [];
    
    if (legacyMaterial.portionsPerUnit) {
      notes.push(`${legacyMaterial.portionsPerUnit} ${legacyMaterial.portionType || 'portions'} per unit`);
    }
    
    if (legacyMaterial.costPerPortion) {
      notes.push(`Cost per portion: $${legacyMaterial.costPerPortion}`);
    }
    
    if (legacyMaterial.pricing) {
      notes.push(`Markup: ${legacyMaterial.pricing.materialMarkup}x`);
    }
    
    notes.push(`Converted from legacy material: ${legacyMaterial.displayName}`);
    
    return notes.join('; ');
  }

  /**
   * Convert variant material back to legacy format (for backward compatibility)
   */
  static convertVariantToLegacy(variantMaterial, variantIndex = 0) {
    if (!variantMaterial.hasVariants || !variantMaterial.variants[variantIndex]) {
      throw new Error('Invalid variant material or variant index');
    }
    
    const variant = variantMaterial.variants[variantIndex];
    
    return {
      _id: variantMaterial._id,
      sku: variant.sku,
      name: `${variant.metalType}_${variant.karat}_${variantMaterial.name}`,
      displayName: `${variant.karat.toUpperCase()} ${variant.metalType.charAt(0).toUpperCase() + variant.metalType.slice(1)} ${variantMaterial.displayName}`,
      category: variantMaterial.category,
      unitCost: variant.unitCost,
      unitType: variantMaterial.unitType,
      compatibleMetals: variant.compatibleMetals,
      supplier: variantMaterial.supplier,
      description: variantMaterial.description,
      stuller_item_number: variant.stullerProductId,
      auto_update_pricing: variantMaterial.autoUpdate,
      last_price_update: variant.lastUpdated,
      isActive: variant.isActive,
      createdAt: variantMaterial.createdAt,
      updatedAt: variantMaterial.updatedAt,
      createdBy: variantMaterial.createdBy,
      karat: variant.karat.toUpperCase(),
      metalType: variant.metalType
    };
  }

  /**
   * Group similar legacy materials for variant conversion
   */
  static groupSimilarMaterials(materials) {
    const groups = {};
    
    materials.forEach(material => {
      // Create base key for grouping
      const baseKey = this.generateBaseName(material.name) + '_' + material.category;
      
      if (!groups[baseKey]) {
        groups[baseKey] = {
          baseName: this.generateBaseName(material.name),
          baseDisplayName: this.generateBaseDisplayName(material.displayName),
          category: material.category,
          materials: []
        };
      }
      
      groups[baseKey].materials.push(material);
    });
    
    // Filter to only groups with multiple materials
    return Object.values(groups).filter(group => group.materials.length > 1);
  }

  /**
   * Create a multi-variant material from a group of similar materials
   */
  static createMultiVariantFromGroup(materialGroup) {
    if (materialGroup.materials.length === 0) {
      throw new Error('Cannot create variant material from empty group');
    }
    
    // Use the first material as the base
    const baseMaterial = materialGroup.materials[0];
    
    const multiVariant = {
      _id: baseMaterial._id, // Keep the first material's ID
      name: materialGroup.baseName,
      displayName: materialGroup.baseDisplayName,
      category: materialGroup.category,
      unitType: baseMaterial.unitType,
      supplier: baseMaterial.supplier,
      description: baseMaterial.description,
      isActive: true,
      autoUpdate: baseMaterial.auto_update_pricing || false,
      
      hasVariants: true,
      variants: materialGroup.materials.map((material, index) => ({
        metalType: this.extractMetalType(material.compatibleMetals),
        karat: this.normalizeKarat(material.karat),
        sku: material.sku,
        unitCost: material.unitCost,
        stullerProductId: material.stuller_item_number,
        compatibleMetals: [this.extractMetalType(material.compatibleMetals)],
        isActive: material.isActive,
        lastUpdated: material.last_price_update || new Date(),
        notes: this.generateVariantNotes(material)
      })),
      
      // Clear legacy fields
      unitCost: null,
      sku: null,
      stullerProductId: null,
      metalType: null,
      karat: null,
      
      createdAt: baseMaterial.createdAt,
      updatedAt: new Date(),
      createdBy: baseMaterial.createdBy
    };
    
    return {
      multiVariant,
      originalMaterialIds: materialGroup.materials.map(m => m._id)
    };
  }

  /**
   * Calculate cost for a specific variant
   */
  static calculateVariantCost(variantMaterial, metalType, karat) {
    if (!variantMaterial.hasVariants) {
      return variantMaterial.unitCost || 0;
    }
    
    const variant = variantMaterial.variants.find(v => 
      v.metalType === metalType && v.karat === karat && v.isActive
    );
    
    return variant ? variant.unitCost : 0;
  }
}

export default MaterialDataConverter;
