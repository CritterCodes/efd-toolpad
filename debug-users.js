/**
 * Find all users with the same email to identify duplicates
 */

const { MongoClient } = require('mongodb');

async function findDuplicateUsers() {
    const client = new MongoClient(process.env.MONGODB_URI);
    
    try {
        console.log('🔧 [DEBUG] Connecting to database...');
        await client.connect();
        const db = client.db(process.env.MONGO_DB_NAME);
        
        const email = 'jacobaengel55@gmail.com';
        
        console.log(`🔍 [DEBUG] Finding ALL users with email: ${email}`);
        
        // Find all users with this email
        const users = await db.collection('users').find({ email }).toArray();
        
        console.log(`📋 [DEBUG] Found ${users.length} users with email ${email}:`);
        
        users.forEach((user, index) => {
            console.log(`\n👤 [USER ${index + 1}]:`);
            console.log(`   _id: ${user._id}`);
            console.log(`   userID: ${user.userID}`);
            console.log(`   email: ${user.email}`);
            console.log(`   role: ${user.role}`);
            console.log(`   firstName: ${user.firstName}`);
            console.log(`   lastName: ${user.lastName}`);
            console.log(`   status: ${user.status}`);
            console.log(`   password: ${user.password ? (user.password.startsWith('$2a$') ? 'BCRYPT_HASH' : user.password) : 'NO_PASSWORD'}`);
            console.log(`   createdAt: ${user.createdAt}`);
            console.log(`   updatedAt: ${user.updatedAt}`);
        });
        
        if (users.length > 1) {
            console.log(`\n⚠️  [DEBUG] DUPLICATE USERS DETECTED!`);
            console.log(`We need to clean this up. Which user should we keep?`);
            console.log(`The admin user should be the one with role: 'admin'`);
            
            const adminUsers = users.filter(u => u.role === 'admin');
            const clientUsers = users.filter(u => u.role === 'client');
            
            console.log(`\n📊 [SUMMARY]:`);
            console.log(`   Admin users: ${adminUsers.length}`);
            console.log(`   Client users: ${clientUsers.length}`);
            
            if (adminUsers.length > 0) {
                console.log(`\n✅ [RECOMMENDATION]: Keep the admin user and delete the client user(s)`);
                
                // Show which to delete
                clientUsers.forEach(user => {
                    console.log(`🗑️  DELETE: userID ${user.userID} (role: ${user.role})`);
                });
            }
        }
        
    } catch (error) {
        console.error('❌ [DEBUG] Error:', error);
    } finally {
        await client.close();
    }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Run the debug
findDuplicateUsers().catch(console.error);