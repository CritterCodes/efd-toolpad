#!/usr/bin/env node

/**
 * Script to check and update user roles in production
 * Run with: node check-user-role.js
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = "mongodb://critter:Zapatas2024@23.94.251.158:27017/?directConnection=true&serverSelectionTimeoutMS=2000&authSource=admin&appName=mongosh+2.3.3";
const MONGO_DB_NAME = "efd-database";

async function checkAndUpdateUserRole() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(MONGO_DB_NAME);
    const users = db.collection('users');
    
    // Your email from environment variables
    const adminEmail = "jacobaengel55@gmail.com";
    
    // Check current user role
    const user = await users.findOne({ email: adminEmail });
    
    if (!user) {
      console.log(`❌ User not found: ${adminEmail}`);
      return;
    }
    
    console.log(`📧 User: ${user.email}`);
    console.log(`🔑 Current Role: ${user.role}`);
    console.log(`📅 Created: ${user.createdAt}`);
    console.log(`🆔 ID: ${user._id}`);
    
    if (user.role === 'client') {
      console.log('\n🚨 FOUND THE ISSUE: User role is "client" - should be "admin"');
      console.log('This is why access is being denied to the admin panel.');
      
      // Update role to admin
      const result = await users.updateOne(
        { email: adminEmail },
        { 
          $set: { 
            role: 'admin',
            updatedAt: new Date()
          }
        }
      );
      
      if (result.modifiedCount > 0) {
        console.log('✅ Successfully updated user role to "admin"');
        
        // Verify the update
        const updatedUser = await users.findOne({ email: adminEmail });
        console.log(`🔍 Verified new role: ${updatedUser.role}`);
      } else {
        console.log('❌ Failed to update user role');
      }
    } else if (user.role === 'admin') {
      console.log('✅ User role is already "admin" - this is correct');
    } else {
      console.log(`⚠️ User has role "${user.role}" - consider changing to "admin"`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n📱 After updating role, try accessing the admin panel again');
  }
}

checkAndUpdateUserRole();