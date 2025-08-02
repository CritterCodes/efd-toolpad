#!/usr/bin/env node

const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '../.env.local' });

async function verifyPricing() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(process.env.MONGO_DB_NAME || 'efd-database');
    
    const tasks = await db.collection('repairTasks').find({}).limit(3).toArray();
    
    console.log('🔍 PRICING VERIFICATION');
    console.log('========================');
    
    for (const task of tasks) {
      console.log(`\nSKU: ${task.sku}`);
      console.log(`Title: ${task.title}`);
      console.log(`Category: ${task.category}`);
      console.log(`Original Price: $${task.analytics?.originalPrice || 0}`);
      console.log(`New Base Price: $${task.basePrice}`);
      
      if (task.pricing?.components) {
        console.log(`Components:`);
        console.log(`  Labor Hours: ${task.laborHours}h × $${task.pricing.components.wage} = $${task.pricing.components.laborCost}`);
        console.log(`  Material: $${task.materialCost} × 1.5 = $${task.pricing.components.materialMarkup}`);
        console.log(`  Business Multiplier: ${task.pricing.components.businessMultiplier.toFixed(3)}`);
        console.log(`  Formula Applied: ${task.pricing.formula}`);
        console.log(`  Calculated At: ${task.pricing.calculatedAt.toLocaleString()}`);
      }
    }
    
    await client.close();
    console.log('\n✅ Verification complete');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

verifyPricing();
