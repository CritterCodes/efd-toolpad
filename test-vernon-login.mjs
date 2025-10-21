#!/usr/bin/env node

/**
 * Test Vernon's login with case-insensitive email matching
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb://critter:Zapatas2024@23.94.251.158:27017/?directConnection=true&serverSelectionTimeoutMS=2000&authSource=admin';
// Use production database for verification
const DB_NAME = 'efd-database';

async function testCaseInsensitiveEmailLookup() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔧 Testing case-insensitive email lookup for Vernon...\n');
    
    await client.connect();
    const db = client.db(DB_NAME);
    const users = db.collection('users');
    
    // Test different case variations
    const testEmails = [
      'vernonmcnabb1984@gmail.com',     // Lowercase (what's in DB)
      'Vernonmcnabb1984@gmail.com',     // Capital V (what user types)
      'VERNONMCNABB1984@GMAIL.COM',     // All caps
      'VernonMcnabb1984@Gmail.com'      // Mixed case
    ];
    
    console.log('Testing email variations:');
    
    for (const email of testEmails) {
      console.log(`\n📧 Testing: "${email}"`);
      
      // Old method (case-sensitive)
      const exactMatch = await users.findOne({ email });
      console.log(`   Exact match: ${exactMatch ? '✅ Found' : '❌ Not found'}`);
      
      // New method (case-insensitive)
      const caseInsensitiveMatch = await users.findOne({ 
        email: { $regex: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }
      });
      console.log(`   Case-insensitive: ${caseInsensitiveMatch ? '✅ Found' : '❌ Not found'}`);
      
      if (caseInsensitiveMatch) {
        console.log(`   User role: ${caseInsensitiveMatch.role}`);
        console.log(`   User status: ${caseInsensitiveMatch.status}`);
        console.log(`   DB email: "${caseInsensitiveMatch.email}"`);
      }
    }
    
    console.log('\n🎯 Summary:');
    console.log('- Case-insensitive matching should now work for all variations');
    console.log('- Vernon should be able to log in with "Vernonmcnabb1984@gmail.com"');
    console.log('- The system will find his user record with "vernonmcnabb1984@gmail.com"');
    
  } catch (error) {
    console.error('❌ Error testing case-insensitive lookup:', error);
  } finally {
    await client.close();
  }
}

testCaseInsensitiveEmailLookup().catch(console.error);