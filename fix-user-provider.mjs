// Fix user provider in database - run once to clean up old Google provider data
import { UnifiedUserService } from './src/lib/unifiedUserService.js';

async function fixUserProvider() {
    try {
        console.log('🔧 Connecting to database...');
        
        // Find the user
        const user = await UnifiedUserService.findUserByEmailSafe('jacobaengel55@gmail.com');
        
        if (!user) {
            console.log('❌ User not found');
            return;
        }
        
        console.log('📋 Current user data:', {
            userID: user.userID,
            email: user.email,
            role: user.role,
            primaryProvider: user.primaryProvider,
            authProvider: user.authProvider
        });
        
        // Update the user to have correct Shopify provider
        console.log('🔄 Updating user provider to Shopify...');
        
        const { connectToDatabase } = await import('./src/lib/mongodb.js');
        const { db } = await connectToDatabase();
        
        const updateResult = await db.collection('users').updateOne(
            { userID: user.userID },
            {
                $set: {
                    primaryProvider: 'shopify',
                    authProvider: 'shopify'
                },
                $unset: {
                    // Remove any old Google-specific fields if they exist
                    googleId: '',
                    'providers.google': ''
                }
            }
        );
        
        console.log('✅ Update result:', updateResult);
        
        // Verify the update
        const updatedUser = await UnifiedUserService.findUserByEmailSafe('jacobaengel55@gmail.com');
        console.log('✅ Updated user data:', {
            userID: updatedUser.userID,
            email: updatedUser.email,
            role: updatedUser.role,
            primaryProvider: updatedUser.primaryProvider,
            authProvider: updatedUser.authProvider
        });
        
        console.log('🎯 User provider fixed! Try logging in again.');
        
    } catch (error) {
        console.error('❌ Error fixing user provider:', error);
    }
}

// Run the fix
fixUserProvider().catch(console.error);