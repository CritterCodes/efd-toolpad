import { MongoClient } from 'mongodb';
import { disposableCatalogFilter } from './migrations/pp-catalog-foundation.mjs';

export async function restoreCatalogSnapshot(database, snapshotId) {
  const snapshot = await database.collection('_catalogSnapshots').findOne({ snapshotId });
  if (!snapshot) throw new Error(`snapshot not found: ${snapshotId}`);
  await database.collection('drops').deleteMany(disposableCatalogFilter);
  await database.collection('collections').deleteMany(disposableCatalogFilter);
  if (snapshot.drops.length) await database.collection('drops').insertMany(snapshot.drops);
  if (snapshot.collections.length) await database.collection('collections').insertMany(snapshot.collections);
  return { drops: snapshot.drops.length, collections: snapshot.collections.length };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const snapshotId = process.argv[2];
  const dbName = process.env.MIGRATE_DB;
  if (!snapshotId || !dbName || !['efd-database-DEV', 'efd-db-migrate'].includes(dbName)) throw new Error('usage: MIGRATE_DB=<nonprod> ... restore-catalog-snapshot.mjs <snapshotId>');
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  try {
    const result = await restoreCatalogSnapshot(client.db(dbName), snapshotId);
    console.log(`Restored ${result.drops} drop(s) and ${result.collections} collection(s) from ${snapshotId}.`);
  } finally { await client.close(); }
}
