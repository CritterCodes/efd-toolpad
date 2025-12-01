/**
 * Direct migration script - run with: node scripts/migrate-status.mjs
 */
import { MongoClient } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';

// Load .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

async function migrateProducts() {
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }

  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db(process.env.MONGO_DB_NAME || 'efd-database');
    const productsCollection = db.collection('products');

    console.log('🔄 Starting product status migration...');

    // Mapping old statuses to new model
    const migrationRules = {
      'draft': { status: 'draft', isApproved: false },
      'pending-approval': { status: 'published', isApproved: false },
      'approved': { status: 'published', isApproved: true },
      'published': { status: 'published', isApproved: true },
      'rejected': { status: 'draft', isApproved: false },
      'revision-requested': { status: 'draft', isApproved: false },
      'archived': { status: 'archived', isApproved: true }
    };

    // Get all products
    const products = await productsCollection.find({}).toArray();
    console.log(`📦 Found ${products.length} products to check`);

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
            oldStatus: oldStatus
          }
        }
      );

      if (result.modifiedCount > 0) {
        migratedCount++;
        console.log(`✅ Migrated ${product.title || product._id}: ${oldStatus} → ${migration.status} (isApproved: ${migration.isApproved})`);
      }
    }

    console.log(`\n✨ Migration complete!`);
    console.log(`   ✅ Migrated: ${migratedCount}`);
    console.log(`   ⏭️  Already migrated: ${skippedCount}`);
    console.log(`   📊 Total: ${products.length}`);

    return { migratedCount, skippedCount, totalCount: products.length };
  } finally {
    await client.close();
  }
}

// Run migration
migrateProducts()
  .then(() => {
    console.log('\n✅ Migration successful!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
