/**
 * Simple duplicate user cleanup that can be run directly
 */

async function cleanupDuplicates() {
  try {
    // Import dynamically to avoid ES module issues
    const { default: UnifiedUserService } = await import('../src/lib/unifiedUserService.js');
    
    console.log('🚀 Starting duplicate user cleanup...\n');
    
    // Find duplicates first
    const duplicates = await UnifiedUserService.findDuplicateEmails();
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate emails found!');
    } else {
      console.log(`⚠️ Found ${duplicates.length} emails with duplicates\n`);
      
      // Show duplicates
      duplicates.forEach(group => {
        console.log(`📧 Email: ${group._id} (${group.count} users)`);
        group.users.forEach((user, index) => {
          const providers = Object.keys(user.providers || {}).join(', ') || 'none';
          console.log(`   ${index + 1}. ${user.userID} (${user.firstName} ${user.lastName}, providers: ${providers})`);
        });
        console.log('');
      });
    }
    
    // Initialize database (this will clean up duplicates)
    await UnifiedUserService.initializeDatabase();
    
    console.log('✅ Cleanup completed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

cleanupDuplicates();