/**
 * Snapshot and reset ONLY disposable Drop/Collection test records, then install deterministic fixtures.
 * Dry-run is read-only. The snapshot lives outside both reset collections and is sufficient for restore.
 * Apply: MIGRATE_DB=efd-database-DEV CATALOG_FIXTURE_ENV=dev node --env-file=.env.local scripts/migrations/pp-catalog-foundation.mjs
 * Restore: add --restore=<snapshotId> (restore is intentionally a separate explicit operation).
 */
import { randomUUID } from 'crypto';
import { runMigration, collExists } from './_lib.mjs';
import { catalogFixtures, FIXTURE_VERSION } from '../../src/services/production/catalogFixtures.js';

const fixtureEnvironment = process.env.CATALOG_FIXTURE_ENV || 'dev';
const fixture = catalogFixtures(fixtureEnvironment);

export const steps = [
  {
    title: 'snapshot disposable drops and collections for rollback',
    run: async ({ db, dbName, dryRun }) => {
      const drops = (await collExists(db, 'drops')) ? await db.collection('drops').find({}).toArray() : [];
      const collections = (await collExists(db, 'collections')) ? await db.collection('collections').find({}).toArray() : [];
      if (dryRun) return `would snapshot ${drops.length} drop(s) and ${collections.length} collection(s); no Product/Design/Piece reads or writes`;
      const snapshotId = `catalog-${dbName}-${Date.now()}-${randomUUID().slice(0, 8)}`;
      await db.collection('_catalogSnapshots').insertOne({ snapshotId, createdAt: new Date(), fixtureVersion: FIXTURE_VERSION, drops, collections });
      return `snapshot ${snapshotId}: ${drops.length} drop(s), ${collections.length} collection(s)`;
    },
  },
  {
    title: 'reset only drops and collections and install isolated deterministic fixtures',
    run: async ({ db, dryRun }) => {
      if (dryRun) return `would reset only drops/collections and seed ${fixtureEnvironment} fixture ${FIXTURE_VERSION}`;
      await db.collection('drops').deleteMany({});
      await db.collection('collections').deleteMany({});
      const now = new Date();
      await db.collection('drops').insertMany(fixture.drops.map((doc) => ({ ...doc, createdAt: now, updatedAt: now })));
      await db.collection('collections').insertMany(fixture.collections.map((doc) => ({ ...doc, createdAt: now, updatedAt: now })));
      return `reset only drops/collections; seeded ${fixtureEnvironment} fixture ${FIXTURE_VERSION}`;
    },
  },
  {
    title: 'ensure separate drop and smart collection indexes',
    run: async ({ db, dryRun }) => {
      if (dryRun) return 'would ensure canonical indexes on separate drops and collections schemas';
      await Promise.all([
        db.collection('drops').createIndex({ dropId: 1 }, { unique: true }),
        db.collection('drops').createIndex({ slug: 1 }, { unique: true }),
        db.collection('drops').createIndex({ ownerType: 1, ownerId: 1 }),
        db.collection('drops').createIndex({ status: 1, releaseAt: 1 }),
        db.collection('collections').createIndex({ collectionId: 1 }, { unique: true }),
        db.collection('collections').createIndex({ slug: 1 }, { unique: true }),
        db.collection('collections').createIndex({ status: 1 }),
      ]);
      return 'ensured separate drop and smart collection indexes';
    },
  },
];

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration({ name: 'pp-catalog-foundation', steps }).catch((error) => { console.error(`✖ ${error.stack || error.message}`); process.exit(1); });
}
