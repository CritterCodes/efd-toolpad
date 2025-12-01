#!/usr/bin/env node

// Debug script to check gemstone products in database
import { MongoClient } from 'mongodb';

const mongoUri = 'mongodb://critter:Zapatas2024@23.94.251.158:27017/?directConnection=true&serverSelectionTimeoutMS=10000&authSource=admin&appName=mongosh+2.3.3';
const dbName = 'efd-database-DEV';

async function debugGemstones() {
  console.log('🔍 Debugging Gemstone Products in Database...\n');
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db(dbName);
    
    // Check total products
    const totalProducts = await db.collection('products').countDocuments();
    console.log(`📊 Total products in database: ${totalProducts}`);
    
    // Check gemstone products
    const gemstoneProducts = await db.collection('products').find({ 
      productType: 'gemstone' 
    }).toArray();
    console.log(`💎 Gemstone products found: ${gemstoneProducts.length}`);
    
    // Check legacy gemstones (without productType)
    const legacyGemstones = await db.collection('products').find({ 
      species: { $exists: true },
      productType: { $exists: false }
    }).toArray();
    console.log(`📜 Legacy gemstone products (no productType): ${legacyGemstones.length}`);
    
    // Show sample gemstone data
    if (gemstoneProducts.length > 0) {
      console.log('\n📋 Sample Gemstone Product:');
      console.log(JSON.stringify(gemstoneProducts[0], null, 2));
    }
    
    if (legacyGemstones.length > 0) {
      console.log('\n📋 Sample Legacy Gemstone:');
      console.log(JSON.stringify(legacyGemstones[0], null, 2));
    }
    
    // Check user IDs in products
    const userIds = await db.collection('products').distinct('userId');
    console.log(`\n👥 Unique user IDs in products: ${userIds.length}`);
    userIds.forEach(id => console.log(`  - ${id}`));
    
    // Check users collection for comparison
    const users = await db.collection('users').find({}).toArray();
    console.log(`\n👤 Users in database: ${users.length}`);
    users.forEach(user => {
      console.log(`  - Email: ${user.email}, ID: ${user._id}`);
      if (user.artisanApplication?.businessName) {
        console.log(`    Business: ${user.artisanApplication.businessName}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

debugGemstones();