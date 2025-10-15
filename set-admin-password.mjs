/**
 * Set a proper password for your admin account
 */

import bcrypt from 'bcryptjs';
import { connectToDatabase } from './src/lib/mongodb.js';

async function setAdminPassword() {
    try {
        console.log('🔧 [PASSWORD_RESET] Setting admin password...');
        
        const { db } = await connectToDatabase();
        
        // Set a simple password for your admin account
        const email = 'jacobaengel55@gmail.com';
        const password = 'admin123'; // Change this to whatever you want
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const result = await db.collection('users').updateOne(
            { email: email },
            {
                $set: {
                    password: hashedPassword,
                    updatedAt: new Date()
                }
            }
        );
        
        if (result.modifiedCount > 0) {
            console.log(`✅ [PASSWORD_RESET] Password set for ${email}`);
            console.log(`📋 [PASSWORD_RESET] Login credentials:`);
            console.log(`   Email: ${email}`);
            console.log(`   Password: ${password}`);
        } else {
            console.log(`❌ [PASSWORD_RESET] User not found: ${email}`);
        }
        
    } catch (error) {
        console.error('❌ [PASSWORD_RESET] Error setting password:', error);
    }
}

// Run the password reset
setAdminPassword().catch(console.error);