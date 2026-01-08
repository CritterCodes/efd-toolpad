const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/efd-toolpad';

async function debugMaterials() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔍 Connecting to MongoDB...');
    await client.connect();
    
    const db = client.db();
    console.log(`📊 Connected to database: ${db.databaseName}`);
    
    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log('📁 Collections found:', collections.map(c => c.name));
    
    // Check materials collection
    const materialsCollection = db.collection('materials');
    const materialCount = await materialsCollection.countDocuments();
    console.log(`📦 Total materials: ${materialCount}`);
    
    if (materialCount > 0) {
      // Get first few materials to see structure
      const samples = await materialsCollection.find({}).limit(3).toArray();
      console.log('\n🔍 Sample materials:');
      samples.forEach((material, index) => {
        console.log(`\n--- Material ${index + 1} ---`);
        console.log('ID:', material._id);
        console.log('Name:', material.name || 'No name');
        console.log('Type:', material.type || 'No type');
        console.log('Has stullerProducts:', !!material.stullerProducts);
        console.log('stullerProducts length:', material.stullerProducts?.length || 0);
        if (material.stullerProducts && material.stullerProducts.length > 0) {
          console.log('First Stuller Product:', JSON.stringify(material.stullerProducts[0], null, 2));
        }
        console.log('Keys:', Object.keys(material));
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

debugMaterials();
