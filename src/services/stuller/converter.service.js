export class StullerConverterService {
  /**
   * Convert Stuller product to our material format
   * @param {Object} stullerProduct - Stuller product data
   * @returns {Object} - Material object in our format
   */
  convertToMaterial(stullerProduct) {
    const material = {
      name: stullerProduct.name.toLowerCase().replace(/\s+/g, '_'),
      displayName: stullerProduct.name,
      category: stullerProduct.category,
      unitType: this.determineUnitType(stullerProduct.category),
      supplier: 'Stuller',
      description: stullerProduct.description,
      isActive: true,
      autoUpdate: true,
      hasVariants: stullerProduct.variants && stullerProduct.variants.length > 0,
      variants: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Convert variants
    if (material.hasVariants) {
      material.variants = stullerProduct.variants.map(variant => ({
        metalType: variant.metalType,
        karat: variant.karat,
        sku: variant.sku,
        unitCost: variant.unitCost,
        stullerProductId: stullerProduct.id,
        compatibleMetals: [variant.metalType],
        isActive: variant.inStock,
        lastUpdated: new Date(),
        notes: this.buildVariantNotes(variant)
      }));
      
      // Set legacy fields to null
      material.unitCost = null;
      material.sku = null;
      material.stullerProductId = null;
      material.metalType = null;
      material.karat = null;
    } else {
      // Single variant - use legacy format
      const variant = stullerProduct.variants[0];
      material.unitCost = variant.unitCost;
      material.sku = variant.sku;
      material.stullerProductId = stullerProduct.id;
      material.metalType = variant.metalType;
      material.karat = variant.karat;
      material.compatibleMetals = [variant.metalType];
    }

    return material;
  }

  /**
   * Determine unit type based on category
   */
  determineUnitType(category) {
    const unitTypeMap = {
      solder: 'application',
      wire: 'inch',
      sheet: 'square_inch',
      findings: 'piece',
      stones: 'carat',
      consumable: 'application',
      tools: 'piece'
    };
    return unitTypeMap[category] || 'piece';
  }

  /**
   * Build notes for variant based on additional properties
   */
  buildVariantNotes(variant) {
    const notes = [];
    if (variant.color) notes.push(`Color: ${variant.color}`);
    if (variant.gauge) notes.push(`Gauge: ${variant.gauge}`);
    if (variant.size) notes.push(`Size: ${variant.size}`);
    if (variant.weight) notes.push(`Weight: ${variant.weight}`);
    if (variant.length) notes.push(`Length: ${variant.length}`);
    if (variant.quantity) notes.push(`Quantity: ${variant.quantity}`);
    return notes.join(', ');
  }
}
