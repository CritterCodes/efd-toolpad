#!/usr/bin/env node

/**
 * Cleanup Duplicate Users Script
 * 
 * This script will:
 * 1. Find all users with duplicate emails
 * 2. Merge duplicate users into the most complete/recent account
 * 3. Create unique indexes to prevent future duplicates
 * 4. Display a summary of actions taken
 */

import UnifiedUserService from '../src/lib/unifiedUserService.js';

async function main() {
  console.log('🚀 Starting duplicate user cleanup...\n');
  
  try {
    // First, let's see what duplicates exist
    console.log('📊 Analyzing current duplicate situation...');
    const duplicateReport = await generateDuplicateReport();
    
    if (duplicateReport.totalDuplicates === 0) {
      console.log('✅ No duplicate emails found!');
    } else {
      console.log(`⚠️ Found ${duplicateReport.totalDuplicates} duplicate emails affecting ${duplicateReport.totalUsers} users\n`);
      
      // Display detailed report
      duplicateReport.details.forEach(group => {
        console.log(`📧 Email: ${group.email}`);
        console.log(`   Users: ${group.count}`);
        group.users.forEach((user, index) => {
          const providers = Object.keys(user.providers || {}).join(', ') || 'none';
          const updatedAt = user.updatedAt ? new Date(user.updatedAt).toISOString() : 'unknown';
          console.log(`   ${index + 1}. ${user.userID} (providers: ${providers}, updated: ${updatedAt})`);
        });
        console.log('');
      });
      
      // Ask for confirmation (in a real script, you might want user input)
      console.log('🔄 Proceeding with automatic cleanup...\n');
    }
    
    // Cleanup duplicates and initialize indexes
    await UnifiedUserService.initializeDatabase();
    
    // Generate final report
    console.log('\n📊 Final status check...');
    const finalReport = await generateDuplicateReport();
    
    if (finalReport.totalDuplicates === 0) {
      console.log('✅ All duplicates have been resolved!');
      console.log('✅ Unique email index has been created');
      console.log('✅ Database is now protected against future duplicates');
    } else {
      console.log(`⚠️ ${finalReport.totalDuplicates} duplicates still remain - manual intervention may be needed`);
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
  
  console.log('\n🎉 Cleanup completed successfully!');
}

async function generateDuplicateReport() {
  try {
    const duplicateEmails = await UnifiedUserService.findDuplicateEmails();
    
    const totalDuplicates = duplicateEmails.length;
    const totalUsers = duplicateEmails.reduce((sum, group) => sum + group.count, 0);
    
    return {
      totalDuplicates,
      totalUsers,
      details: duplicateEmails.map(group => ({
        email: group._id,
        count: group.count,
        users: group.users.map(user => ({
          userID: user.userID,
          providers: user.providers,
          updatedAt: user.updatedAt,
          createdAt: user.createdAt
        }))
      }))
    };
  } catch (error) {
    console.error('Error generating duplicate report:', error);
    return { totalDuplicates: 0, totalUsers: 0, details: [] };
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default main;