/**
 * Migration script to convert old status model to new model
 * Old: status: 'draft', 'pending-approval', 'approved', 'rejected', 'archived'
 * New: status: 'draft', 'published', 'archived' + isApproved: true/false
 */

import { db } from '@/lib/database.js';
import { ObjectId } from 'mongodb';

export async function migrateProductsToNewStatusModel() {
  try {
    const database = await db.connect();
    const productsCollection = database.collection('products');

    console.log('🔄 Starting product status migration...');

    // Mapping old statuses to new model
    const migrationRules = {
      'draft': { status: 'draft', isApproved: false },
      'pending-approval': { status: 'published', isApproved: false },
      'approved': { status: 'published', isApproved: true },
      'published': { status: 'published', isApproved: true },
      'rejected': { status: 'draft', isApproved: false },
      'revision-requested': { status: 'draft', isApproved: false },
      'archived': { status: 'archived', isApproved: true } // Keep approval if archived
    };

    // Get all products
    const products = await productsCollection.find({}).toArray();
    console.log(`📦 Found ${products.length} products to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const product of products) {
      const oldStatus = product.status || 'draft';
      
      // Skip if already has isApproved field (already migrated)
      if (typeof product.isApproved === 'boolean') {
        skippedCount++;
        continue;
      }

      const migration = migrationRules[oldStatus];
      
      if (!migration) {
        console.warn(`⚠️  Unknown status "${oldStatus}" for product ${product._id}`);
        continue;
      }

      // Update product with new model
      const result = await productsCollection.updateOne(
        { _id: product._id },
        {
          $set: {
            status: migration.status,
            isApproved: migration.isApproved,
            migratedAt: new Date(),
            oldStatus: oldStatus // Keep track of what it was
          }
        }
      );

      if (result.modifiedCount > 0) {
        migratedCount++;
        console.log(`✅ Migrated product ${product._id}: ${oldStatus} → ${migration.status} (isApproved: ${migration.isApproved})`);
      }
    }

    console.log(`\n✨ Migration complete!`);
    console.log(`   ✅ Migrated: ${migratedCount}`);
    console.log(`   ⏭️  Already migrated: ${skippedCount}`);
    console.log(`   📊 Total: ${products.length}`);

    return { migratedCount, skippedCount, totalCount: products.length };
  } catch (error) {
    console.error('❌ Migration error:', error);
    throw error;
  }
}

// Run migration if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateProductsToNewStatusModel()
    .then(() => {
      console.log('\n✅ Migration successful!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Migration failed:', error);
      process.exit(1);
    });
}
