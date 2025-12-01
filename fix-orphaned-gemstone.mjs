#!/usr/bin/env node

// Migration script to fix orphaned gemstone userId
import { MongoClient, ObjectId } from 'mongodb';

const mongoUri = 'mongodb://critter:Zapatas2024@23.94.251.158:27017/?directConnection=true&serverSelectionTimeoutMS=10000&authSource=admin&appName=mongosh+2.3.3';
const dbName = 'efd-database-DEV';

async function fixOrphanedGemstone() {
  console.log('🔧 Fixing orphaned gemstone userId...\n');
  
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db(dbName);
    
    // Find the orphaned gemstone
    const orphanedGemstone = await db.collection('products').findOne({
      userId: "user-0feb2313"
    });
    
    if (!orphanedGemstone) {
      console.log('❌ No orphaned gemstone found');
      return;
    }
    
    console.log('📋 Found orphaned gemstone:');
    console.log(`  - ID: ${orphanedGemstone._id}`);
    console.log(`  - Title: ${orphanedGemstone.title}`);
    console.log(`  - Vendor: ${orphanedGemstone.vendor}`);
    console.log(`  - Current userId: ${orphanedGemstone.userId}`);
    
    // Find user with matching business name
    const matchingUser = await db.collection('users').findOne({
      'artisanApplication.businessName': orphanedGemstone.vendor
    });
    
    if (matchingUser) {
      console.log(`\n✅ Found matching user: ${matchingUser.email}`);
      console.log(`  - User ID: ${matchingUser._id}`);
      console.log(`  - Business: ${matchingUser.artisanApplication?.businessName}`);
      
      // Update the gemstone to use the correct user ID
      const result = await db.collection('products').updateOne(
        { _id: orphanedGemstone._id },
        { 
          $set: { 
            userId: matchingUser._id.toString() // Use ObjectId string
          } 
        }
      );
      
      console.log(`\n🎉 Updated gemstone userId: ${result.modifiedCount} document(s) modified`);
      
      // Verify the update
      const updatedGemstone = await db.collection('products').findOne({
        _id: orphanedGemstone._id
      });
      console.log(`✓ New userId: ${updatedGemstone.userId}`);
      
    } else {
      console.log('\n❌ No matching user found by business name');
      console.log('Available users with business names:');
      
      const businessUsers = await db.collection('users').find({
        'artisanApplication.businessName': { $exists: true, $ne: '' }
      }).toArray();
      
      businessUsers.forEach(user => {
        console.log(`  - ${user.email}: ${user.artisanApplication.businessName}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

fixOrphanedGemstone();