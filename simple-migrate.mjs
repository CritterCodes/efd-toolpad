/**
 * Simple database migration for clean user structure
 */

// Import directly with dynamic import to avoid module issues
async function migrateUsers() {
    try {
        console.log('🔧 [MIGRATION] Starting user data cleanup...');
        
        // Dynamic import
        const { connectToDatabase } = await import('./src/lib/mongodb.js');
        const bcrypt = await import('bcryptjs');
        
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
            
            // Special handling for your admin account
            if (user.email === 'jacobaengel55@gmail.com') {
                // Set a proper password for your admin account
                const adminPassword = 'admin123';
                cleanUser.password = await bcrypt.default.hash(adminPassword, 10);
                console.log(`🔑 [MIGRATION] Set admin password for ${user.email}: ${adminPassword}`);
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
        
        console.log('🔑 [MIGRATION] Admin login credentials:');
        console.log('   Email: jacobaengel55@gmail.com');
        console.log('   Password: admin123');
        
    } catch (error) {
        console.error('❌ [MIGRATION] Migration failed:', error);
    }
}

// Run the migration
migrateUsers().catch(console.error);