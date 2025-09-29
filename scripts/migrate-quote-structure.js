/**
 * Quote Data Migration Script
 * Migrates quote data from flat structure to nested quote structure
 * and removes duplicate properties at root level
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.NODE_ENV === 'production' ? 'efd-database' : 'efd-database-DEV';

async function migrateQuoteData() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('🔗 Connected to MongoDB');
    
    const db = client.db(DATABASE_NAME);
    const collection = db.collection('customTickets');
    
    // Find all tickets that have both flat and nested quote data
    const tickets = await collection.find({
      $or: [
        { centerstone: { $exists: true } },
        { accentStones: { $exists: true } },
        { mounting: { $exists: true } },
        { laborTasks: { $exists: true } },
        { shippingCosts: { $exists: true } },
        { analytics: { $exists: true } },
        { quoteTotal: { $exists: true } }
      ]
    }).toArray();
    
    console.log(`📊 Found ${tickets.length} tickets to migrate`);
    
    let migrated = 0;
    let errors = 0;
    
    for (const ticket of tickets) {
      try {
        console.log(`\n🔄 Processing ticket: ${ticket.ticketID}`);
        
        // Check if ticket already has a properly structured quote
        const hasNestedQuote = ticket.quote && typeof ticket.quote === 'object';
        
        // Collect all quote-related data from root level
        const flatQuoteData = {};
        const flatQuoteFields = [
          'centerstone',
          'accentStones', 
          'mounting',
          'additionalMaterials',
          'laborTasks',
          'shippingCosts',
          'isRush',
          'includeCustomDesign',
          'customDesignFee',
          'quoteTotal',
          'analytics',
          'quotePublished',
          'publishedAt'
        ];
        
        // Extract flat data
        flatQuoteFields.forEach(field => {
          if (ticket[field] !== undefined) {
            flatQuoteData[field] = ticket[field];
          }
        });
        
        console.log('📋 Flat quote fields found:', Object.keys(flatQuoteData));
        
        // Determine the source of truth for quote data
        let finalQuoteData = {};
        
        if (hasNestedQuote && Object.keys(flatQuoteData).length > 0) {
          // Both exist - use nested as source of truth, but merge missing fields from flat
          console.log('🔀 Merging nested quote (priority) with flat data');
          finalQuoteData = {
            ...flatQuoteData,  // flat data as base
            ...ticket.quote    // nested data overrides
          };
        } else if (hasNestedQuote) {
          // Only nested exists
          console.log('✅ Using existing nested quote data');
          finalQuoteData = ticket.quote;
        } else if (Object.keys(flatQuoteData).length > 0) {
          // Only flat exists - migrate to nested
          console.log('📦 Migrating flat data to nested structure');
          finalQuoteData = flatQuoteData;
        } else {
          // No quote data found
          console.log('⚠️  No quote data found - skipping');
          continue;
        }
        
        // Prepare update operations
        const updateOperations = {
          $set: {
            quote: finalQuoteData,
            updatedAt: new Date()
          },
          $unset: {}
        };
        
        // Remove duplicate fields from root level
        flatQuoteFields.forEach(field => {
          if (ticket[field] !== undefined) {
            updateOperations.$unset[field] = "";
          }
        });
        
        console.log('🗑️  Removing root-level fields:', Object.keys(updateOperations.$unset));
        console.log('💾 Final quote structure keys:', Object.keys(finalQuoteData));
        
        // Update the ticket
        const result = await collection.updateOne(
          { _id: ticket._id },
          updateOperations
        );
        
        if (result.modifiedCount > 0) {
          console.log('✅ Successfully migrated ticket:', ticket.ticketID);
          migrated++;
        } else {
          console.log('⚠️  No changes made to ticket:', ticket.ticketID);
        }
        
      } catch (error) {
        console.error(`❌ Error migrating ticket ${ticket.ticketID}:`, error);
        errors++;
      }
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`✅ Successfully migrated: ${migrated} tickets`);
    console.log(`❌ Errors: ${errors} tickets`);
    console.log(`📊 Total processed: ${tickets.length} tickets`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await client.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the migration
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateQuoteData()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export { migrateQuoteData };