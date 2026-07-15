import { MongoClient } from 'mongodb';

const snapshotId = process.argv[2];
const dbName = process.env.MIGRATE_DB;
if (!snapshotId || !dbName || !['efd-database-DEV', 'efd-db-migrate'].includes(dbName)) throw new Error('usage: MIGRATE_DB=<nonprod> ... restore-catalog-snapshot.mjs <snapshotId>');
const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
try {
  const database = client.db(dbName);
  const snapshot = await database.collection('_catalogSnapshots').findOne({ snapshotId });
  if (!snapshot) throw new Error(`snapshot not found: ${snapshotId}`);
  await database.collection('drops').deleteMany({});
  await database.collection('collections').deleteMany({});
  if (snapshot.drops.length) await database.collection('drops').insertMany(snapshot.drops);
  if (snapshot.collections.length) await database.collection('collections').insertMany(snapshot.collections);
  console.log(`Restored ${snapshot.drops.length} drop(s) and ${snapshot.collections.length} collection(s) from ${snapshotId}.`);
} finally { await client.close(); }
