import { createHash } from 'node:crypto';

const FIXTURE_VERSION = 'catalog-foundation-v1';
const PREVIEW_STATE_ID = 'catalog-foundation';

export function catalogFixtures(environment = 'dev') {
  if (!['dev', 'preview'].includes(environment)) throw new Error('catalog fixtures are restricted to dev or preview');
  const prefix = environment === 'preview' ? 'preview-' : 'dev-';
  const dropId = `${prefix}drop-signature`;
  const designMTO = `${prefix}design-signature-ring`;
  const designRTS = `${prefix}design-signature-pendant`;
  const variantMTO = `${prefix}variant-ring-7`;
  const variantRTS = `${prefix}variant-pendant-gold`;
  return {
    drops: [{
      dropId, slug: `${prefix}signature`, name: `${environment.toUpperCase()} Signature Drop`,
      description: 'Deterministic catalog fixture', ownerType: 'efd', ownerId: null, ownerInfo: null,
      channels: ['online'], status: 'draft', releaseAt: null, releasedAt: null,
      designOrder: [designMTO, designRTS], heroImage: null, thumbnail: null, seo: {},
      fixtureVersion: FIXTURE_VERSION,
    }],
    collections: [
      {
        collectionId: `${prefix}collection-made-to-order`, slug: `${prefix}made-to-order`, name: `${environment.toUpperCase()} Made to Order`,
        description: 'Deterministic catalog fixture — MTO smart collection', status: 'draft',
        rules: { all: [{ field: 'offers', operator: 'contains', value: 'made_to_order' }] },
        manualIncludes: [], manualExcludes: [], pinned: [], media: {}, seo: {}, fixtureVersion: FIXTURE_VERSION,
      },
      {
        collectionId: `${prefix}collection-one-of-one`, slug: `${prefix}one-of-one`, name: `${environment.toUpperCase()} One of One`,
        description: 'Deterministic catalog fixture — one-of-one smart collection', status: 'draft',
        rules: { all: [{ field: 'edition.type', operator: 'eq', value: 'one_of_one' }] },
        manualIncludes: [], manualExcludes: [], pinned: [], media: {}, seo: {}, fixtureVersion: FIXTURE_VERSION,
      },
    ],
    designs: [
      {
        designID: designMTO, dropId, name: `${environment.toUpperCase()} Signature Ring (MTO)`,
        description: 'Catalog fixture — made-to-order ring design', story: '', category: 'ring',
        tags: ['signature', 'made-to-order', 'ring'], metadata: {},
        primaryArtisanId: null, collaborators: [],
        edition: { type: 'limited', limit: 5, allocated: 0, committed: 0, nextNumber: 1 },
        productionMethod: 'cad_cast',
        cadRevisions: [], referenceImages: [], sketches: [], stlVolumeCm3: 2.4,
        variants: [{
          variantId: variantMTO, sku: `${prefix}RING-7`, active: true,
          metalKey: 'GOLD_14K_YELLOW', ringSize: '7',
          sizingAllowance: { min: '6', max: '8' },
          pricing: { retailPrice: 1200 }, leadTimeDays: 21,
          viewer: { customizable: false },
        }],
        bom: { castingEstimate: 0, stones: [], findings: [], estMaterialCost: 0 },
        routing: [], estCost: null, suggestedRetail: null, primaryProductId: null,
        status: 'draft', createdBy: 'fixture', fixtureVersion: FIXTURE_VERSION,
      },
      {
        designID: designRTS, dropId, name: `${environment.toUpperCase()} Signature Pendant (RTS)`,
        description: 'Catalog fixture — ready-to-ship pendant design', story: '', category: 'pendant',
        tags: ['signature', 'ready-to-ship', 'pendant'], metadata: {},
        primaryArtisanId: null, collaborators: [],
        edition: { type: 'one_of_one', allocated: 0, committed: 0, nextNumber: 1 },
        productionMethod: 'cad_cast',
        cadRevisions: [], referenceImages: [], sketches: [], stlVolumeCm3: 1.1,
        variants: [{
          variantId: variantRTS, sku: `${prefix}PENDANT-GOLD`, active: true,
          metalKey: 'GOLD_14K_YELLOW',
          pricing: { retailPrice: 850 }, leadTimeDays: null,
          viewer: { customizable: false },
        }],
        bom: { castingEstimate: 0, stones: [], findings: [], estMaterialCost: 0 },
        routing: [], estCost: null, suggestedRetail: null, primaryProductId: null,
        status: 'ready', createdBy: 'fixture', fixtureVersion: FIXTURE_VERSION,
      },
    ],
    pieces: [
      {
        pieceID: `${prefix}piece-pendant-1`, designID: designRTS, variantId: variantRTS,
        dropId,
        resolvedConfiguration: { metal: 'GOLD_14K_YELLOW' },
        editionNumber: 1, gemstoneId: null,
        sku: `${prefix}PENDANT-GOLD-001`, serialNumber: null,
        metalType: 'gold', karat: '14k', finish: null, ringSize: null,
        dimensions: null, weight: null, stones: [], actualMaterials: [], workOrderIDs: [],
        status: 'available', productID: null, customerID: null, customOrderID: null,
        billing: {}, totalCOGS: null, materialCOGS: null, laborCOGS: null,
        createdBy: 'fixture', fixtureVersion: FIXTURE_VERSION,
      },
    ],
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
  await database.collection('designs').deleteMany({ fixtureVersion: FIXTURE_VERSION, dropId: { $regex: `^${prefix}` } });
  await database.collection('pieces').deleteMany({ fixtureVersion: FIXTURE_VERSION, dropId: { $regex: `^${prefix}` } });
  const now = new Date();
  await database.collection('drops').insertMany(fixture.drops.map((record) => ({ ...record, createdAt: now, updatedAt: now })));
  await database.collection('collections').insertMany(fixture.collections.map((record) => ({ ...record, createdAt: now, updatedAt: now })));
  await database.collection('designs').insertMany(fixture.designs.map((record) => ({ ...record, createdAt: now, updatedAt: now })));
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
  return { fixtureVersion: FIXTURE_VERSION, fixtureDigest, resetDigest: fixtureDigest, resetVerifiedAt: now };
}

export { FIXTURE_VERSION, PREVIEW_STATE_ID };
