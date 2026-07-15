import { MongoClient } from 'mongodb';
import { resetCatalogFixtures } from '../src/services/production/catalogFixtures.js';

const dbName = process.env.MONGO_DB_NAME;
if (!/^efd-preview-[a-z0-9][a-z0-9-]{0,79}$/.test(dbName || '')) {
  throw new Error('MONGO_DB_NAME must be an isolated efd-preview-<feature> database');
}
if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required');

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
try {
  const result = await resetCatalogFixtures(client.db(dbName), 'preview');
  console.log(`Reset ${dbName} to ${result.fixtureVersion} (${result.fixtureDigest})`);
} finally {
  await client.close();
}
