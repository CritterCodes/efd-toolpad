import { createHash } from 'node:crypto';

const FIXTURE_VERSION = 'catalog-foundation-v1';
const PREVIEW_STATE_ID = 'catalog-foundation';

export function catalogFixtures(environment = 'dev') {
  if (!['dev', 'preview'].includes(environment)) throw new Error('catalog fixtures are restricted to dev or preview');
  const prefix = environment === 'preview' ? 'preview-' : 'dev-';
  return {
    drops: [{
      dropId: `${prefix}drop-signature`, slug: `${prefix}signature`, name: `${environment.toUpperCase()} Signature Drop`,
      description: 'Deterministic catalog fixture', ownerType: 'efd', ownerId: null, ownerInfo: null,
      channels: ['online'], status: 'draft', releaseAt: null, releasedAt: null,
      designOrder: [`${prefix}design-signature-ring`], heroImage: null, thumbnail: null, seo: {},
      fixtureVersion: FIXTURE_VERSION,
    }],
    collections: [{
      collectionId: `${prefix}collection-made-to-order`, slug: `${prefix}made-to-order`, name: `${environment.toUpperCase()} Made to Order`,
      description: 'Deterministic catalog fixture', status: 'draft',
      rules: { all: [{ field: 'offers', operator: 'contains', value: 'made_to_order' }] },
      manualIncludes: [], manualExcludes: [], pinned: [], media: {}, seo: {}, fixtureVersion: FIXTURE_VERSION,
    }],
    // Casting-board seed: one needs_ordering piece so the board is non-empty in preview/dev.
    pieces: [{
      pieceID: `${prefix}piece-casting-sample`,
      designID: `${prefix}design-signature-ring`,
      variantId: `${prefix}variant-sig-ring-01`,
      resolvedConfiguration: { metalType: '14k', karat: '14k', color: 'yellow' },
      editionNumber: null,
      gemstoneId: null,
      dropId: null,
      sku: `${prefix.toUpperCase()}CAST-DEMO`,
      metalType: '14k',
      karat: '14k',
      finish: null,
      ringSize: null,
      status: 'planned',
      casting: 'needs_ordering',
      castingReceivedAt: null,
      actualMaterials: [],
      workOrderIDs: [],
      accruedMaterialCost: 0,
      accruedLaborCost: 0,
      totalCOGS: 0,
      productID: null,
      customerID: null,
      customOrderID: null,
      billing: null,
      fixtureVersion: FIXTURE_VERSION,
    }],
  };
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
}

function fixtureRecord(record) {
  const { _id, createdAt, updatedAt, ...fixture } = record;
  return fixture;
}

export function catalogFixtureDigest(fixtures) {
  const stable = {
    drops: fixtures.drops.map(fixtureRecord).sort((a, b) => a.dropId.localeCompare(b.dropId)),
    collections: fixtures.collections.map(fixtureRecord).sort((a, b) => a.collectionId.localeCompare(b.collectionId)),
  };
  return `sha256:${createHash('sha256').update(JSON.stringify(canonicalize(stable))).digest('hex')}`;
}

export async function readCatalogFixtureDigest(database, environment = 'preview') {
  const prefix = environment === 'preview' ? 'preview-' : 'dev-';
  const [drops, collections] = await Promise.all([
    database.collection('drops').find({ fixtureVersion: FIXTURE_VERSION, dropId: { $regex: `^${prefix}` } }).toArray(),
    database.collection('collections').find({ fixtureVersion: FIXTURE_VERSION, collectionId: { $regex: `^${prefix}` } }).toArray(),
  ]);
  return catalogFixtureDigest({ drops, collections });
}

export async function resetCatalogFixtures(database, environment = 'preview') {
  const fixture = catalogFixtures(environment);
  const prefix = environment === 'preview' ? 'preview-' : 'dev-';
  await database.collection('drops').deleteMany({ fixtureVersion: FIXTURE_VERSION, dropId: { $regex: `^${prefix}` } });
  await database.collection('collections').deleteMany({ fixtureVersion: FIXTURE_VERSION, collectionId: { $regex: `^${prefix}` } });
  await database.collection('pieces').deleteMany({ fixtureVersion: FIXTURE_VERSION, pieceID: { $regex: `^${prefix}` } });
  const now = new Date();
  await database.collection('drops').insertMany(fixture.drops.map((record) => ({ ...record, createdAt: now, updatedAt: now })));
  await database.collection('collections').insertMany(fixture.collections.map((record) => ({ ...record, createdAt: now, updatedAt: now })));
  await database.collection('pieces').insertMany(fixture.pieces.map((record) => ({ ...record, createdAt: now, updatedAt: now })));

  const fixtureDigest = await readCatalogFixtureDigest(database, environment);
  await database.collection('_previewFixtureState').updateOne(
    { _id: PREVIEW_STATE_ID },
    {
      $set: {
        fixtureVersion: FIXTURE_VERSION,
        fixtureDigest,
        resetDigest: fixtureDigest,
        resetVerifiedAt: now,
        resetPath: '/api/preview-context/reset',
        updatedAt: now,
      },
      $setOnInsert: { seededAt: now },
    },
    { upsert: true },
  );
  return { fixtureVersion: FIXTURE_VERSION, fixtureDigest, resetVerifiedAt: now };
}

export { FIXTURE_VERSION, PREVIEW_STATE_ID };
