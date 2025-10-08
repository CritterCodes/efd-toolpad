import pkg from './src/lib/unifiedUserService.js';
const { UnifiedUserService } = pkg;

async function checkUserRole() {
    try {
        console.log('🔍 Checking user role for jacobaengel55@gmail.com...');
        
        const user = await UnifiedUserService.findUserByEmailSafe('jacobaengel55@gmail.com');
        
        if (user) {
            console.log('📋 User found in database:');
            console.log('  Email:', user.email);
            console.log('  Role:', user.role);
            console.log('  Status:', user.status);
            console.log('  UserID:', user.userID);
            console.log('  Providers:', Object.keys(user.providers || {}));
            console.log('  Created:', user.createdAt);
            console.log('  Updated:', user.updatedAt);
        } else {
            console.log('❌ User NOT found in database');
        }
        
    } catch (error) {
        console.error('Error checking user role:', error);
    }
}

checkUserRole().then(() => process.exit(0));