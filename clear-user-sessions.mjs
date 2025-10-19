#!/usr/bin/env node

/**
 * Script to completely clear all sessions for a user
 * This will force a fresh authentication flow
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = "mongodb://critter:Zapatas2024@23.94.251.158:27017/?directConnection=true&serverSelectionTimeoutMS=2000&authSource=admin&appName=mongosh+2.3.3";
const MONGO_DB_NAME = "efd-database";

async function clearUserSessions() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db(MONGO_DB_NAME);
    
    // Your email
    const adminEmail = "jacobaengel55@gmail.com";
    
    // Get user first
    const users = db.collection('users');
    const user = await users.findOne({ email: adminEmail });
    
    if (!user) {
      console.log(`❌ User not found: ${adminEmail}`);
      return;
    }
    
    console.log(`📧 User: ${user.email}`);
    console.log(`🔑 Current Role: ${user.role}`);
    console.log(`🆔 User ID: ${user._id}`);
    
    // Clear all sessions for this user
    const sessions = db.collection('sessions');
    
    // Find sessions by user ID (NextAuth stores sessions this way)
    const userSessions = await sessions.find({ userId: user._id.toString() }).toArray();
    console.log(`\n🔍 Found ${userSessions.length} sessions for this user`);
    
    if (userSessions.length > 0) {
      // Delete all sessions
      const deleteResult = await sessions.deleteMany({ userId: user._id.toString() });
      console.log(`🗑️ Deleted ${deleteResult.deletedCount} sessions`);
    }
    
    // Also clear any account-based sessions (NextAuth stores these too)
    const accounts = db.collection('accounts');
    const userAccounts = await accounts.find({ userId: user._id.toString() }).toArray();
    console.log(`🔍 Found ${userAccounts.length} account records`);
    
    // Also check for verification tokens
    const verificationTokens = db.collection('verificationtokens');
    const tokens = await verificationTokens.find({ identifier: adminEmail }).toArray();
    console.log(`🔍 Found ${tokens.length} verification tokens`);
    
    if (tokens.length > 0) {
      const deleteTokens = await verificationTokens.deleteMany({ identifier: adminEmail });
      console.log(`🗑️ Deleted ${deleteTokens.deletedCount} verification tokens`);
    }
    
    console.log('\n✅ Session cleanup complete!');
    console.log('\n📱 Next steps:');
    console.log('1. Clear browser cookies for repair.engelsfinedesign.com');
    console.log('2. Go to https://repair.engelsfinedesign.com/auth/signin');
    console.log('3. Sign in fresh - should pick up admin role from database');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

clearUserSessions();