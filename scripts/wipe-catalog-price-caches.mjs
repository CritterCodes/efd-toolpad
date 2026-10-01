/**
 * Wipe the STORED prices off the catalog — tasks and processes — once nothing reads them.
 *
 * Owner, 2026-09-30: "There should never be old saved prices, and they just need to be wiped from the
 * database. It should always be calculated." And: "do not wipe the repair tickets. This is preventative,
 * not changing the past." So this touches ONLY the catalog (`tasks`, `processes`) — never repairs,
 * invoices or anything a customer was charged.
 *
 * RUN ONLY AFTER the one-engine code (branch claude/pricing-one-engine) is deployed: the code before it
 * falls back to these fields, so wiping first would blank prices in the live app.
 *
 * Reversible: every removed value is copied first into `priceCacheBackup_20260930`
 * ({ collection, docId, fields, wipedAt }).
 *
 *   MONGODB_URI=... MONGO_DB_NAME=efd-database node scripts/wipe-catalog-price-caches.mjs           # dry run
 *   MONGODB_URI=... MONGO_DB_NAME=efd-database node scripts/wipe-catalog-price-caches.mjs --apply   # wipe
 */
import { MongoClient } from 'mongodb';

const TARGETS = {
  // Mirrors src/services/pricing/computedFields.js COMPUTED_PRICE_FIELDS.
  tasks: ['pricing', 'universalPricing', 'basePrice', 'price', 'retailPrice', 'wholesalePrice', 'totalCosts', 'wholesaleCosts', 'calculatedAt'],
  processes: ['pricing', 'metalPrices'],
};
const BACKUP = 'priceCacheBackup_20260930';

async function main() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGO_DB_NAME;
  if (!uri || !dbName) throw new Error('MONGODB_URI and MONGO_DB_NAME are required (name the database explicitly).');
  const apply = process.argv.includes('--apply');

  const client = new MongoClient(uri);
  await client.connect();
  try {
    const db = client.db(dbName);
    for (const [collection, fields] of Object.entries(TARGETS)) {
      const docs = await db.collection(collection)
        .find({ $or: fields.map((f) => ({ [f]: { $exists: true } })) })
        .project(Object.fromEntries(fields.map((f) => [f, 1])))
        .toArray();
      console.log(`${collection}: ${docs.length} document(s) carry a stored price${apply ? '' : ' (dry run — nothing changed)'}`);
      if (!apply || docs.length === 0) continue;

      const wipedAt = new Date();
      await db.collection(BACKUP).insertMany(docs.map(({ _id, ...stored }) => ({ collection, docId: _id, fields: stored, wipedAt })));
      const res = await db.collection(collection).updateMany(
        { _id: { $in: docs.map((d) => d._id) } },
        { $unset: Object.fromEntries(fields.map((f) => [f, ''])) },
      );
      console.log(`  wiped ${res.modifiedCount}; backed up to ${BACKUP}`);
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
