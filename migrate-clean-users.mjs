/**
 * Migration script to clean up existing user data and standardize to new schema
 * Run this once to convert existing users to the clean format
 */

import { connectToDatabase } from './src/lib/mongodb.js';

async function migrateUsers() {
    try {
        console.log('🔧 [MIGRATION] Starting user data cleanup...');
        
        const { db } = await connectToDatabase();
        const users = await db.collection('users').find({}).toArray();
        
        console.log(`📋 [MIGRATION] Found ${users.length} users to migrate`);
        
        for (const user of users) {
            console.log(`🔄 [MIGRATION] Processing user: ${user.email}`);
            
            // Create clean user object
            const cleanUser = {
                userID: user.userID, // Keep existing userID
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email,
                phoneNumber: user.phoneNumber || '',
                address: user.address || {},
                image: user.image || '',
                role: user.role || 'customer',
                status: user.status || 'verified',
                business: user.business || '', // For wholesalers
                createdAt: user.createdAt || new Date(),
                updatedAt: new Date(),
                lastSignIn: user.lastSignIn || null,
                appointments: user.appointments || [],
                jewelry: user.jewelry || [],
                customRequests: user.customRequests || [],
                preferences: user.preferences || {},
                verificationToken: user.verificationToken || null
            };
            
            // Handle password - preserve existing hashed passwords for wholesalers
            if (user.password && user.password.startsWith('$2a$')) {
                // Keep existing bcrypt password (wholesalers)
                cleanUser.password = user.password;
            } else if (user.shopifyId || user.providers?.shopify) {
                // Set Shopify auth marker for Shopify customers
                cleanUser.password = 'shopify-auth';
                cleanUser.shopifyId = user.shopifyId || user.providers?.shopify?.id || '';
                cleanUser.shopifyData = user.shopifyData || {};
            } else {
                // Set a placeholder - user will need to reset password
                cleanUser.password = 'needs-reset';
            }
            
            // Remove all the complex auth provider data
            const fieldsToRemove = {
                primaryProvider: '',
                providers: '',
                linkedAt: '',
                authProvider: '',
                googleId: '',
                'providers.google': '',
                'providers.shopify': ''
            };
            
            // Update the user document
            await db.collection('users').updateOne(
                { _id: user._id },
                {
                    $set: cleanUser,
                    $unset: fieldsToRemove
                }
            );
            
            console.log(`✅ [MIGRATION] Migrated user: ${user.email} (${user.role})`);
        }
        
        console.log('🎯 [MIGRATION] Migration completed successfully!');
        
        // Show summary
        const summary = await db.collection('users').aggregate([
            {
                $group: {
                    _id: '$role',
                    count: { $sum: 1 }
                }
            }
        ]).toArray();
        
        console.log('📊 [MIGRATION] User summary after migration:');
        summary.forEach(role => {
            console.log(`  - ${role._id}: ${role.count} users`);
        });
        
    } catch (error) {
        console.error('❌ [MIGRATION] Migration failed:', error);
    }
}

// Run the migration
migrateUsers().catch(console.error);