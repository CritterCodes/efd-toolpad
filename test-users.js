// Test script to check users in database
import UserService from './src/app/api/users/service.js';

async function testUsers() {
    try {
        console.log('🔍 Testing user lookup...');
        
        // Try to find a user by a common admin email
        const adminUser = await UserService.getUserByQuery({ email: 'admin@engelfindesign.com' });
        console.log('Admin user:', adminUser);
        
        // Try to find all users to see what's in the database
        const allUsers = await UserService.getAllUsers();
        console.log('All users count:', allUsers?.length || 0);
        
        if (allUsers && allUsers.length > 0) {
            console.log('First few users:');
            allUsers.slice(0, 3).forEach(user => {
                console.log({
                    userID: user.userID,
                    email: user.email,
                    role: user.role,
                    firstName: user.firstName,
                    lastName: user.lastName
                });
            });
        }
        
    } catch (error) {
        console.error('❌ Error testing users:', error);
    }
}

testUsers();