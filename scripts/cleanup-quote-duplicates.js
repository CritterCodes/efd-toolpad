/**
 * Clean up quote duplicates in the database
 * Removes root-level quote fields when nested quote object exists
 */

const { MongoClient } = require('mongodb');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.NODE_ENV === 'production' ? 'efd-database' : 'efd-database-DEV';

async function cleanupQuoteData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('🔗 Connected to MongoDB');
    
    const db = client.db(DATABASE_NAME);
    const collection = db.collection('customTickets');
    
    // Find tickets that have both nested quote and root-level quote fields
    const tickets = await collection.find({
      quote: { $exists: true, $ne: null },
      $or: [
        { centerstone: { $exists: true } },
        { accentStones: { $exists: true } },
        { mounting: { $exists: true } },
        { laborTasks: { $exists: true } },
        { shippingCosts: { $exists: true } },
        { analytics: { $exists: true } },
        { quoteTotal: { $exists: true } },
        { additionalMaterials: { $exists: true } },
        { isRush: { $exists: true } },
        { includeCustomDesign: { $exists: true } },
        { customDesignFee: { $exists: true } },
        { quotePublished: { $exists: true } },
        { publishedAt: { $exists: true } }
      ]
    }).toArray();
    
    console.log(`📊 Found ${tickets.length} tickets with duplicate quote data`);
    
    if (tickets.length === 0) {
      console.log('✅ No cleanup needed - all data is properly structured');
      return;
    }
    
    // Remove the duplicate root-level fields
    const rootLevelQuoteFields = {
      centerstone: "",
      accentStones: "",
      mounting: "",
      additionalMaterials: "",
      laborTasks: "",
      shippingCosts: "",
      isRush: "",
      includeCustomDesign: "",
      customDesignFee: "",
      analytics: "",
      quotePublished: "",
      publishedAt: ""
    };
    
    // Also clean up the legacy quoteTotal if it exists at root but not in quote
    const updateOperation = {
      $unset: rootLevelQuoteFields,
      $set: {
        updatedAt: new Date()
      }
    };
    
    console.log('🧹 Cleaning up root-level quote fields:', Object.keys(rootLevelQuoteFields));
    
    const result = await collection.updateMany(
      {
        quote: { $exists: true, $ne: null },
        $or: [
          { centerstone: { $exists: true } },
          { accentStones: { $exists: true } },
          { mounting: { $exists: true } },
          { laborTasks: { $exists: true } },
          { shippingCosts: { $exists: true } },
          { analytics: { $exists: true } },
          { additionalMaterials: { $exists: true } },
          { isRush: { $exists: true } },
          { includeCustomDesign: { $exists: true } },
          { customDesignFee: { $exists: true } },
          { quotePublished: { $exists: true } },
          { publishedAt: { $exists: true } }
        ]
      },
      updateOperation
    );
    
    console.log('\n📈 Cleanup Summary:');
    console.log(`✅ Modified ${result.modifiedCount} tickets`);
    console.log(`📊 Matched ${result.matchedCount} tickets`);
    
    // Verify the cleanup
    const verificationResult = await collection.find({
      quote: { $exists: true, $ne: null },
      $or: [
        { centerstone: { $exists: true } },
        { accentStones: { $exists: true } },
        { mounting: { $exists: true } },
        { laborTasks: { $exists: true } },
        { shippingCosts: { $exists: true } },
        { analytics: { $exists: true } }
      ]
    }).toArray();
    
    if (verificationResult.length === 0) {
      console.log('✅ Verification passed - no more duplicate fields found');
    } else {
      console.log(`⚠️  Warning: ${verificationResult.length} tickets still have duplicate fields`);
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the cleanup
cleanupQuoteData()
  .then(() => {
    console.log('🎉 Quote cleanup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });