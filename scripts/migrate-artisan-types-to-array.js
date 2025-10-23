/**
 * Migration Script: Convert Artisan Types from CSV String to Array
 * 
 * This script fixes the data format inconsistency where artisan types
 * were stored as CSV strings instead of arrays.
 */

const { connectToDatabase } = require('../src/lib/mongodb.js');

async function migrateArtisanTypes() {
    try {
        console.log('🔄 Starting artisan type migration...');
        
        const { db } = await connectToDatabase();
        
        // Find all users with artisan applications that have string artisan types
        const usersToUpdate = await db.collection('users').find({
            'artisanApplication.artisanType': { $type: 'string' }
        }).toArray();
        
        console.log(`📊 Found ${usersToUpdate.length} users with string artisan types to convert`);
        
        if (usersToUpdate.length === 0) {
            console.log('✅ No migration needed - all artisan types are already arrays');
            return;
        }
        
        let updateCount = 0;
        
        for (const user of usersToUpdate) {
            const currentType = user.artisanApplication?.artisanType;
            
            if (typeof currentType === 'string' && currentType.trim()) {
                // Convert CSV string to array
                const typeArray = currentType.split(',').map(type => type.trim()).filter(type => type);
                
                // Update the user document
                await db.collection('users').updateOne(
                    { _id: user._id },
                    { 
                        $set: { 
                            'artisanApplication.artisanType': typeArray 
                        } 
                    }
                );
                
                updateCount++;
                console.log(`✅ Updated ${user.email}: "${currentType}" → [${typeArray.join(', ')}]`);
            }
        }
        
        console.log(`🎉 Migration completed! Updated ${updateCount} user records`);
        
        // Verify the migration
        const remainingStringTypes = await db.collection('users').countDocuments({
            'artisanApplication.artisanType': { $type: 'string' }
        });
        
        if (remainingStringTypes === 0) {
            console.log('✅ Migration verification successful - no string types remaining');
        } else {
            console.warn(`⚠️  Warning: ${remainingStringTypes} string types still remain`);
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    }
}

// Run the migration if this file is executed directly
if (require.main === module) {
    migrateArtisanTypes()
        .then(() => {
            console.log('🎯 Migration script completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Migration script failed:', error);
            process.exit(1);
        });
}

module.exports = { migrateArtisanTypes };