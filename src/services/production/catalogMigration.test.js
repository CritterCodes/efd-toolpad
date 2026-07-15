import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { MongoClient } from 'mongodb';
import { steps } from '../../../scripts/migrations/pp-catalog-foundation.mjs';
import { restoreCatalogSnapshot } from '../../../scripts/restore-catalog-snapshot.mjs';

describe('catalog migration snapshot and restore', () => {
  let server;
  let client;
  let database;

  beforeAll(async () => {
    server = await MongoMemoryServer.create();
    client = new MongoClient(server.getUri());
    await client.connect();
    database = client.db('efd-database-DEV');
  }, 120000);

  afterAll(async () => {
    await client?.close();
    await server?.stop();
  });

  it('dry-runs without writes, snapshots only reset collections, and restores exact records', async () => {
    const originalDrop = { dropId: 'original-drop', slug: 'original-drop', fixtureVersion: 'legacy-test-fixture' };
    const originalCollection = { collectionId: 'original-collection', slug: 'original-collection', fixtureVersion: 'legacy-test-fixture' };
    const productionDrop = { dropId: 'production-drop', slug: 'production-drop', name: 'Must survive' };
    const productionCollection = { collectionId: 'production-collection', slug: 'production-collection', name: 'Must survive' };
    const protectedDesign = { designID: 'must-survive', concept: 'preexisting protected data' };
    await database.collection('drops').insertOne(originalDrop);
    await database.collection('collections').insertOne(originalCollection);
    await database.collection('drops').insertOne(productionDrop);
    await database.collection('collections').insertOne(productionCollection);
    await database.collection('designs').insertOne(protectedDesign);

    for (const step of steps) await step.run({ db: database, dbName: 'efd-database-DEV', dryRun: true });
    expect(await database.collection('_catalogSnapshots').countDocuments()).toBe(0);
    expect(await database.collection('drops').findOne({ dropId: originalDrop.dropId })).toBeTruthy();

    for (const step of steps) await step.run({ db: database, dbName: 'efd-database-DEV', dryRun: false });
    const snapshot = await database.collection('_catalogSnapshots').findOne({});
    expect(snapshot.drops).toMatchObject([originalDrop]);
    expect(snapshot.collections).toMatchObject([originalCollection]);
    expect(await database.collection('drops').findOne({ dropId: productionDrop.dropId })).toMatchObject(productionDrop);
    expect(await database.collection('collections').findOne({ collectionId: productionCollection.collectionId })).toMatchObject(productionCollection);
    expect(await database.collection('designs').findOne({ designID: protectedDesign.designID })).toMatchObject(protectedDesign);

    const restored = await restoreCatalogSnapshot(database, snapshot.snapshotId);
    expect(restored).toEqual({ drops: 1, collections: 1 });
    expect(await database.collection('drops').findOne({ dropId: originalDrop.dropId })).toMatchObject(originalDrop);
    expect(await database.collection('collections').findOne({ collectionId: originalCollection.collectionId })).toMatchObject(originalCollection);
    expect(await database.collection('drops').findOne({ dropId: productionDrop.dropId })).toMatchObject(productionDrop);
    expect(await database.collection('collections').findOne({ collectionId: productionCollection.collectionId })).toMatchObject(productionCollection);
    expect(await database.collection('designs').findOne({ designID: protectedDesign.designID })).toMatchObject(protectedDesign);
  }, 120000);
});
