/**
 * Script to fix materials that should be metal-dependent but are missing the isMetalDependent flag
 */

const { MongoClient } = require('mongodb');

async function fixMetalDependentMaterials() {
  const client = new MongoClient(process.env.DATABASE_URL || 'mongodb://localhost:27017/efd-react');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const materials = db.collection('materials');
    
    // Find all materials that have stullerProducts but are missing isMetalDependent flag
    const materialsToUpdate = await materials.find({
      $and: [
        { stullerProducts: { $exists: true, $type: 'array', $ne: [] } },
        { 
          $or: [
            { isMetalDependent: { $exists: false } },
            { isMetalDependent: null },
            { isMetalDependent: undefined }
          ]
        }
      ]
    }).toArray();
    
    console.log(`Found ${materialsToUpdate.length} materials that need isMetalDependent flag set to true`);
    
    for (const material of materialsToUpdate) {
      console.log(`Updating material: ${material.displayName} (${material.sku})`);
      
      const result = await materials.updateOne(
        { _id: material._id },
        { 
          $set: { 
            isMetalDependent: true,
            updatedAt: new Date()
          } 
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`  ✅ Updated ${material.displayName}`);
      } else {
        console.log(`  ❌ Failed to update ${material.displayName}`);
      }
    }
    
    // Also find materials with compatibleMetals array and set them as metal-dependent
    const legacyMaterials = await materials.find({
      $and: [
        { compatibleMetals: { $exists: true, $type: 'array', $ne: [] } },
        { 
          $or: [
            { isMetalDependent: { $exists: false } },
            { isMetalDependent: null },
            { isMetalDependent: undefined }
          ]
        }
      ]
    }).toArray();
    
    console.log(`Found ${legacyMaterials.length} legacy materials with compatibleMetals that need isMetalDependent flag`);
    
    for (const material of legacyMaterials) {
      console.log(`Updating legacy material: ${material.displayName} (${material.sku})`);
      
      const result = await materials.updateOne(
        { _id: material._id },
        { 
          $set: { 
            isMetalDependent: true,
            updatedAt: new Date()
          } 
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`  ✅ Updated ${material.displayName}`);
      } else {
        console.log(`  ❌ Failed to update ${material.displayName}`);
      }
    }
    
    console.log('\n🎉 Material dependency flags have been updated!');
    
  } catch (error) {
    console.error('Error fixing material dependency flags:', error);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
fixMetalDependentMaterials().catch(console.error);
