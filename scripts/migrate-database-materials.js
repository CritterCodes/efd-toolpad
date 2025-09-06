/**
 * Database Material Pricing Migration Script
 * 
 * This script connects to your MongoDB database and migrates all materials
 * from the problematic pricing structure to the clean pricing structure.
 * 
 * Usage: node scripts/migrate-database-materials.js
 */

const { MongoClient } = require('mongodb');

// Configuration
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/efd-toolpad';
const DATABASE_NAME = process.env.MONGO_DB_NAME || 'efd-toolpad';
const MATERIALS_COLLECTION = 'materials';

/**
 * Calculate portion-based pricing from Stuller products
 */
const calculateCleanPricing = (stullerProduct, portionsPerUnit = 1) => {
  const stullerPrice = parseFloat(stullerProduct.stullerPrice) || 0;
  const markupRate = parseFloat(stullerProduct.markupRate) || 1;
  
  const markedUpPrice = stullerPrice * markupRate;
  const costPerPortion = stullerPrice / portionsPerUnit;
  const pricePerPortion = markedUpPrice / portionsPerUnit;
  
  return {
    stullerPrice,
    markupRate,
    markedUpPrice,
    costPerPortion,
    pricePerPortion,
    portionsPerUnit,
    calculatedAt: new Date().toISOString()
  };
};

/**
 * Update Stuller product with clean pricing structure
 */
const updateStullerProductPricing = (stullerProduct, portionsPerUnit = 1) => {
  const cleanPricing = calculateCleanPricing(stullerProduct, portionsPerUnit);
  
  const updatedProduct = {
    ...stullerProduct,
    stullerPrice: cleanPricing.stullerPrice,
    markupRate: cleanPricing.markupRate,
    markedUpPrice: cleanPricing.markedUpPrice,
    costPerPortion: cleanPricing.costPerPortion,
    pricePerPortion: cleanPricing.pricePerPortion,
    lastUpdated: new Date().toISOString()
  };

  // Remove misleading properties
  delete updatedProduct.unitCost;
  
  return updatedProduct;
};

/**
 * Migrate a single material document
 */
const migrateMaterial = (material) => {
  console.log(`🔄 Migrating: ${material.displayName || material.name}`);
  
  if (!material.stullerProducts || material.stullerProducts.length === 0) {
    console.log('   ✅ No Stuller products - skipping');
    return { ...material, migrationSkipped: true };
  }
  
  const portionsPerUnit = material.portionsPerUnit || 1;
  let migrationCount = 0;
  
  const updatedStullerProducts = material.stullerProducts.map(product => {
    // Skip if already migrated
    if (product.costPerPortion !== undefined) {
      return product;
    }
    
    console.log(`     • ${product.metalType} ${product.karat}: $${product.stullerPrice} → $${(product.stullerPrice / portionsPerUnit).toFixed(3)} per portion`);
    
    migrationCount++;
    return updateStullerProductPricing(product, portionsPerUnit);
  });
  
  console.log(`   ✅ Updated ${migrationCount} products`);
  
  return {
    ...material,
    stullerProducts: updatedStullerProducts,
    lastMigrated: new Date().toISOString(),
    migrationApplied: migrationCount > 0
  };
};

/**
 * Main migration function
 */
async function migrateDatabaseMaterials() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🚀 Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(MATERIALS_COLLECTION);
    
    // Get all materials with stullerProducts
    console.log('📋 Finding materials with Stuller products...');
    const materials = await collection.find({
      stullerProducts: { $exists: true, $ne: [] }
    }).toArray();
    
    console.log(`📊 Found ${materials.length} materials with Stuller products\n`);
    
    if (materials.length === 0) {
      console.log('✅ No materials to migrate');
      return;
    }
    
    // Migrate each material
    let totalUpdated = 0;
    let totalProducts = 0;
    let migratedProducts = 0;
    
    for (const material of materials) {
      const migratedMaterial = migrateMaterial(material);
      
      if (migratedMaterial.migrationApplied) {
        // Update the document in database
        await collection.updateOne(
          { _id: material._id },
          { $set: migratedMaterial }
        );
        totalUpdated++;
      }
      
      totalProducts += migratedMaterial.stullerProducts?.length || 0;
      migratedProducts += migratedMaterial.stullerProducts?.filter(p => p.costPerPortion !== undefined).length || 0;
    }
    
    console.log(`\n✅ Migration Complete!`);
    console.log(`📊 Summary:`);
    console.log(`   - Materials processed: ${materials.length}`);
    console.log(`   - Materials updated: ${totalUpdated}`);
    console.log(`   - Total Stuller products: ${totalProducts}`);
    console.log(`   - Products migrated: ${migratedProducts}`);
    
    // Show some examples
    console.log(`\n🎯 Example Results:`);
    const updatedMaterials = await collection.find({
      'stullerProducts.costPerPortion': { $exists: true }
    }).limit(3).toArray();
    
    updatedMaterials.forEach(material => {
      console.log(`\n📦 ${material.displayName}:`);
      material.stullerProducts.slice(0, 2).forEach(product => {
        console.log(`   - ${product.metalType} ${product.karat}: $${product.costPerPortion?.toFixed(3)} cost / $${product.pricePerPortion?.toFixed(3)} price per ${material.portionType}`);
      });
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Database connection closed');
  }
}

/**
 * Dry run - show what would be migrated without making changes
 */
async function dryRunMigration() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔍 DRY RUN - Analyzing materials (no changes will be made)\n');
    await client.connect();
    
    const db = client.db(DATABASE_NAME);
    const collection = db.collection(MATERIALS_COLLECTION);
    
    const materials = await collection.find({
      stullerProducts: { $exists: true, $ne: [] }
    }).toArray();
    
    console.log(`📊 Found ${materials.length} materials with Stuller products\n`);
    
    let needsMigration = 0;
    let alreadyMigrated = 0;
    
    materials.forEach(material => {
      const hasNewStructure = material.stullerProducts.some(p => p.costPerPortion !== undefined);
      const hasOldStructure = material.stullerProducts.some(p => p.unitCost !== undefined && p.costPerPortion === undefined);
      
      if (hasOldStructure) {
        needsMigration++;
        console.log(`❌ ${material.displayName}: Needs migration (has unitCost, missing costPerPortion)`);
      } else if (hasNewStructure) {
        alreadyMigrated++;
        console.log(`✅ ${material.displayName}: Already migrated (has costPerPortion)`);
      }
    });
    
    console.log(`\n📊 Analysis Summary:`);
    console.log(`   - Materials needing migration: ${needsMigration}`);
    console.log(`   - Materials already migrated: ${alreadyMigrated}`);
    console.log(`   - Materials to skip: ${materials.length - needsMigration - alreadyMigrated}`);
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    await client.close();
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'dry-run') {
  dryRunMigration();
} else if (command === 'migrate') {
  migrateDatabaseMaterials();
} else {
  console.log('📋 Material Pricing Migration Tool\n');
  console.log('Usage:');
  console.log('  node scripts/migrate-database-materials.js dry-run    # Analyze materials without making changes');
  console.log('  node scripts/migrate-database-materials.js migrate    # Perform actual migration');
  console.log('\nEnvironment Variables:');
  console.log('  MONGODB_URI - MongoDB connection string (default: mongodb://localhost:27017/efd-toolpad)');
}
