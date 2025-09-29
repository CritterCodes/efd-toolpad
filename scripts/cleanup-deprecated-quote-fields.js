/**
 * Clean up deprecated quote fields in the database
 * Removes deprecated root-level fields: amountOwedToCard, quoteTotal
 * These have been moved to the nested quote structure
 */

const { MongoClient } = require('mongodb');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.NODE_ENV === 'production' ? 'efd-database' : 'efd-database-DEV';

// Deprecated fields to remove from root level
const DEPRECATED_FIELDS = [
  'amountOwedToCard',
  'quoteTotal'
];

async function cleanupDeprecatedFields() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('🔗 Connected to MongoDB');
    
    const db = client.db(DATABASE_NAME);
    const collection = db.collection('customTickets');
    
    // Find tickets with deprecated fields
    const query = {
      $or: DEPRECATED_FIELDS.map(field => ({ [field]: { $exists: true } }))
    };
    
    const ticketsWithDeprecatedFields = await collection.find(query).toArray();
    console.log(`📊 Found ${ticketsWithDeprecatedFields.length} tickets with deprecated fields`);
    
    if (ticketsWithDeprecatedFields.length === 0) {
      console.log('✅ No tickets found with deprecated fields - database is clean!');
      return;
    }
    
    // Show what fields will be removed
    const fieldsFound = new Set();
    ticketsWithDeprecatedFields.forEach(ticket => {
      DEPRECATED_FIELDS.forEach(field => {
        if (ticket[field] !== undefined) {
          fieldsFound.add(field);
        }
      });
    });
    
    console.log('🧹 Cleaning up deprecated fields:', Array.from(fieldsFound));
    
    // Remove deprecated fields
    const unsetFields = {};
    DEPRECATED_FIELDS.forEach(field => {
      unsetFields[field] = '';
    });
    
    const result = await collection.updateMany(
      query,
      { $unset: unsetFields }
    );
    
    console.log('\n📈 Cleanup Summary:');
    console.log(`✅ Modified ${result.modifiedCount} tickets`);
    console.log(`📊 Matched ${result.matchedCount} tickets`);
    
    // Verify cleanup
    const remainingTickets = await collection.find(query).toArray();
    if (remainingTickets.length === 0) {
      console.log('✅ Verification passed - no more deprecated fields found');
    } else {
      console.log(`⚠️ Warning: ${remainingTickets.length} tickets still have deprecated fields`);
    }
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the cleanup
cleanupDeprecatedFields()
  .then(() => {
    console.log('🎉 Deprecated fields cleanup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });