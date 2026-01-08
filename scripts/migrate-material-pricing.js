/**
 * Material Data Migration Script
 * 
 * This script migrates existing materials from the problematic pricing structure
 * to the clean pricing structure with proper cost/price separation.
 */

/**
 * Calculate portion-based pricing from Stuller products
 * @param {Object} stullerProduct - Stuller product with pricing info
 * @param {number} portionsPerUnit - Number of portions per unit
 * @returns {Object} - Clean pricing structure
 */
const calculateCleanPricing = (stullerProduct, portionsPerUnit = 1) => {
  const stullerPrice = parseFloat(stullerProduct.stullerPrice) || 0;
  const markupRate = parseFloat(stullerProduct.markupRate) || 1;
  
  // Calculate unit-level pricing
  const markedUpPrice = stullerPrice * markupRate;
  
  // Calculate portion-level pricing (most important for processes)
  const costPerPortion = stullerPrice / portionsPerUnit;
  const pricePerPortion = markedUpPrice / portionsPerUnit;
  
  return {
    // Unit level (what Stuller sells as a complete unit)
    stullerPrice,           // What we pay Stuller per unit
    markupRate,            // Our markup multiplier
    markedUpPrice,         // What we charge per unit
    
    // Portion level (what processes actually use)  
    costPerPortion,        // What we pay per portion (critical for cost calculation)
    pricePerPortion,       // What we charge per portion (critical for pricing)
    
    // Meta
    portionsPerUnit,
    calculatedAt: new Date().toISOString()
  };
};

/**
 * Update Stuller product with clean pricing structure
 * @param {Object} stullerProduct - Original Stuller product
 * @param {number} portionsPerUnit - Number of portions per unit
 * @returns {Object} - Updated Stuller product with clean pricing
 */
const updateStullerProductPricing = (stullerProduct, portionsPerUnit = 1) => {
  const cleanPricing = calculateCleanPricing(stullerProduct, portionsPerUnit);
  
  const updatedProduct = {
    ...stullerProduct,
    
    // Keep essential pricing properties
    stullerPrice: cleanPricing.stullerPrice,
    markupRate: cleanPricing.markupRate,
    markedUpPrice: cleanPricing.markedUpPrice,
    
    // Add critical portion pricing
    costPerPortion: cleanPricing.costPerPortion,
    pricePerPortion: cleanPricing.pricePerPortion,
    
    lastUpdated: new Date().toISOString()
  };

  // Remove redundant/misleading properties
  delete updatedProduct.unitCost;  // This was misleading (was actually marked up price)
  
  return updatedProduct;
};

/**
 * Migrate a single material to the clean pricing structure
 * @param {Object} material - Material object to migrate
 * @returns {Object} - Migrated material object
 */
const migrateMaterial = (material) => {
  console.log(`🔄 Migrating material: ${material.displayName}`);
  
  // Skip materials without Stuller products
  if (!material.stullerProducts || material.stullerProducts.length === 0) {
    console.log(`   ✅ No Stuller products - skipping`);
    return material;
  }
  
  const portionsPerUnit = material.portionsPerUnit || 1;
  let migrationCount = 0;
  
  // Update each Stuller product with clean pricing structure
  const updatedStullerProducts = material.stullerProducts.map(product => {
    
    // Skip if already migrated (has costPerPortion)
    if (product.costPerPortion !== undefined) {
      return product;
    }
    
    console.log(`     • Updating ${product.metalType} ${product.karat}`);
    
    // Calculate clean pricing
    const updatedProduct = updateStullerProductPricing(product, portionsPerUnit);
    
    // Log the changes
    console.log(`       - Stuller price: $${updatedProduct.stullerPrice}`);
    console.log(`       - Cost per portion: $${updatedProduct.costPerPortion.toFixed(3)}`);
    console.log(`       - Price per portion: $${updatedProduct.pricePerPortion.toFixed(3)}`);
    
    migrationCount++;
    return updatedProduct;
  });
  
  console.log(`   ✅ Updated ${migrationCount} Stuller products`);
  
  return {
    ...material,
    stullerProducts: updatedStullerProducts,
    lastMigrated: new Date().toISOString()
  };
};

/**
 * Migrate multiple materials
 * @param {Array} materials - Array of materials to migrate
 * @returns {Array} - Array of migrated materials
 */
const migrateMaterials = (materials) => {
  console.log(`🚀 Starting migration of ${materials.length} materials\n`);
  
  const migratedMaterials = materials.map(material => migrateMaterial(material));
  
  console.log(`\n✅ Migration complete!`);
  console.log(`📊 Summary:`);
  
  let totalProducts = 0;
  let migratedProducts = 0;
  
  migratedMaterials.forEach(material => {
    if (material.stullerProducts) {
      totalProducts += material.stullerProducts.length;
      migratedProducts += material.stullerProducts.filter(p => p.costPerPortion !== undefined).length;
    }
  });
  
  console.log(`   - Total materials: ${migratedMaterials.length}`);
  console.log(`   - Total Stuller products: ${totalProducts}`);
  console.log(`   - Migrated products: ${migratedProducts}`);
  
  return migratedMaterials;
};

// Example usage and testing
const testMigration = () => {
  console.log('🧪 Testing Material Pricing Migration\n');
  
  // Example material with problematic structure (from your process.json)
  const problematicMaterial = {
    "_id": "6897a9836d92aab5eed8db90",
    "name": "hard_solder_sheet",
    "displayName": "Hard Solder Sheet",
    "category": "solder",
    "portionsPerUnit": 30,
    "portionType": "piece",
    "stullerProducts": [
      {
        "id": "1754769640757",
        "stullerItemNumber": "SOLDER:46017:P",
        "metalType": "sterling_silver",
        "karat": "925",
        "stullerPrice": 4.11,
        "markupRate": 2,
        "markedUpPrice": 8.22,
        "unitCost": 8.22  // ❌ Misleading - this is marked up price
      },
      {
        "id": "1754769657382", 
        "stullerItemNumber": "SOLDER:77424:P",
        "metalType": "yellow_gold",
        "karat": "10K",
        "stullerPrice": 82.56,
        "markupRate": 2,
        "markedUpPrice": 165.12,
        "unitCost": 165.12  // ❌ Misleading
      }
    ]
  };
  
  // Migrate the material
  const migratedMaterial = migrateMaterial(problematicMaterial);
  
  console.log('\n📋 Migration Results:');
  console.log('Sterling Silver variant:');
  const silverProduct = migratedMaterial.stullerProducts[0];
  console.log(`  - Stuller price: $${silverProduct.stullerPrice} (what we pay)`);
  console.log(`  - Cost per piece: $${silverProduct.costPerPortion.toFixed(3)} (critical for processes)`);
  console.log(`  - Price per piece: $${silverProduct.pricePerPortion.toFixed(3)} (what customer pays)`);
  
  console.log('\nYellow Gold variant:');
  const goldProduct = migratedMaterial.stullerProducts[1];
  console.log(`  - Stuller price: $${goldProduct.stullerPrice} (what we pay)`);
  console.log(`  - Cost per piece: $${goldProduct.costPerPortion.toFixed(3)} (critical for processes)`);
  console.log(`  - Price per piece: $${goldProduct.pricePerPortion.toFixed(3)} (what customer pays)`);
  
  console.log('\n✅ Test migration successful!');
};

// Export functions for use in other scripts
module.exports = { migrateMaterial, migrateMaterials, updateStullerProductPricing };

// Run test if this file is executed directly
if (require.main === module) {
  testMigration();
}
