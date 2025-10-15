/**
 * Simple user password reset for admin account
 * Uses the existing unifiedUserService to avoid module issues
 */

// Use require since this seems to be CommonJS environment
const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

async function setAdminPassword() {
    const client = new MongoClient(process.env.MONGODB_URI);
    
    try {
        console.log('🔧 [PASSWORD_RESET] Connecting to database...');
        await client.connect();
        const db = client.db(process.env.MONGO_DB_NAME);
        
        // Set password for your admin account
        const email = 'jacobaengel55@gmail.com';
        const password = 'admin123';
        
        console.log(`🔄 [PASSWORD_RESET] Setting password for ${email}...`);
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Update the user with clean structure
        const result = await db.collection('users').updateOne(
            { email: email },
            {
                $set: {
                    password: hashedPassword,
                    updatedAt: new Date()
                },
                $unset: {
                    // Remove all the complex auth provider data
                    primaryProvider: '',
                    providers: '',
                    linkedAt: '',
                    authProvider: '',
                    googleId: ''
                }
            }
        );
        
        if (result.modifiedCount > 0) {
            console.log(`✅ [PASSWORD_RESET] Password set and cleaned up for ${email}`);
            console.log(`📋 [PASSWORD_RESET] Login credentials:`);
            console.log(`   Email: ${email}`);
            console.log(`   Password: ${password}`);
        } else {
            console.log(`❌ [PASSWORD_RESET] User not found: ${email}`);
        }
        
    } catch (error) {
        console.error('❌ [PASSWORD_RESET] Error:', error);
    } finally {
        await client.close();
    }
}

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Debug environment variables
console.log('🔍 [DEBUG] MONGODB_URI:', process.env.MONGODB_URI ? 'LOADED' : 'MISSING');
console.log('🔍 [DEBUG] MONGO_DB_NAME:', process.env.MONGO_DB_NAME);

// Run the password reset
setAdminPassword().catch(console.error);