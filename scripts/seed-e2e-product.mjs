/**
 * P0 (owner #225) — seed a full end-to-end DEV demo on `efd_ring.glb`, built on the existing
 * `dev-customizable-seed-01` design: DESIGN → PIECE → jewelry PRODUCT (published, ready-to-ship AND
 * customizable) → in a published DROP. So the owner/@shop can open a real product page that a customer
 * buys as-is or customizes.
 *
 * Hand-constructs to the product-page-data-contract (headless-safe — avoids the refrakt-barrel import).
 * The product `viewer.meshMap` is SHOP-SAFE: admin-internal `binding` + `volumeCm3` are STRIPPED (§5a);
 * only the visual `customizable` options cross, so the shop `<Customizer>` renders but costBasis never
 * leaks. Idempotent (stable IDs, upsert). DEV-guarded (refuses prod).
 *
 * Usage: node --env-file=.env.local scripts/seed-e2e-product.mjs
 */
import { MongoClient } from 'mongodb';

const URI = process.env.MONGODB_URI;
const DB = process.env.MONGO_DB_NAME;
const die = (m) => { console.error(`✖ ${m}`); process.exit(1); };
if (!URI) die('MONGODB_URI required (--env-file=.env.local).');
if (/^efd-database$/i.test(DB)) die(`Refusing to seed into production ("${DB}").`);

const DESIGN_ID = 'dev-customizable-seed-01';
const PIECE_ID = 'dev-e2e-piece-01';
const PRODUCT_ID = 'efd-e2e-solitaire-01';
const DROP_ID = 'dev-e2e-drop-01';

const c = new MongoClient(URI);
await c.connect();
const db = c.db(DB);
const now = new Date();

const design = await db.collection('designs').findOne({ designID: DESIGN_ID });
if (!design?.viewer?.glbUrl) die(`Design ${DESIGN_ID} (with a viewer) not found — run seed-customizable-design first.`);

// Shop-safe viewer: strip admin-internal binding + volumeCm3; keep the visual customizable options (§5a).
const shopMeshMap = (design.viewer.meshMap || []).map((s) => {
  const { volumeCm3, customizable, ...slot } = s; // eslint-disable-line no-unused-vars
  if (!customizable) return slot;
  const options = (customizable.options || []).map(({ binding, ...o }) => o); // eslint-disable-line no-unused-vars
  return { ...slot, customizable: { ...customizable, options } };
});
const shopViewer = { glbUrl: design.viewer.glbUrl, meshMap: shopMeshMap, modelUnit: design.viewer.modelUnit || 'm' };

// 1) PIECE — a produced, available (ready-to-ship) physical instance of the design.
const actualMaterials = [
  { description: '18K yellow gold mounting', qty: 1, unitCost: 420 },
  { description: '1.0ct natural diamond (center)', qty: 1, unitCost: 1180 },
];
const totalCOGS = actualMaterials.reduce((s, m) => s + m.unitCost * (m.qty || 1), 0); // 1600
await db.collection('pieces').updateOne(
  { pieceID: PIECE_ID },
  { $set: {
    pieceID: PIECE_ID, designID: DESIGN_ID, gemstoneId: design.gemstoneId ?? null,
    sku: 'EFD-E2E-001', metalType: 'gold', karat: '18k',
    actualMaterials, laborLogs: [], totalCOGS,
    workOrderIDs: [], productID: PRODUCT_ID, status: 'available',
    updatedAt: now,
  }, $setOnInsert: { createdAt: now } },
  { upsert: true },
);

// 2) PRODUCT — jewelry, PUBLISHED, ready-to-ship AND customizable (shop-safe viewer).
await db.collection('products').updateOne(
  { productId: PRODUCT_ID },
  { $set: {
    productId: PRODUCT_ID, productType: 'jewelry',
    title: 'Aurora Solitaire (E2E demo)',
    description: 'Ready-to-ship 18K solitaire — buy as-is, or customize the band metal + center stone.',
    status: 'published', availability: 'ready-to-ship',
    publishing: { visible: true, publishedAt: now },
    pricing: { retailPrice: 3950, costBasis: totalCOGS },
    runSize: { type: 'one_of_one', size: 1, remaining: 1 },
    references: { designId: DESIGN_ID, pieceID: PIECE_ID, gemstoneId: design.gemstoneId ?? null },
    pieceIDs: [PIECE_ID],
    viewer: shopViewer,
    images: [],
    updatedAt: now,
  }, $setOnInsert: { createdAt: now } },
  { upsert: true },
);

// 3) DROP — a released collection containing the product.
await db.collection('collections').updateOne(
  { collectionId: DROP_ID },
  { $set: {
    collectionId: DROP_ID, name: 'DEV E2E Drop — Aurora', slug: 'dev-e2e-drop',
    ownerType: 'efd', status: 'released', releaseAt: now, releasedAt: now,
    theme: 'E2E demo', description: 'End-to-end demo drop (owner P0 #225).',
    members: [{ productId: PRODUCT_ID, position: 0, notes: '', addedAt: now }],
    updatedAt: now,
  }, $setOnInsert: { createdAt: now } },
  { upsert: true },
);

const custom = shopMeshMap.filter((s) => s.customizable).map((s) => s.nameContains);
console.log('✓ E2E chain seeded (idempotent) on', DB);
console.log(`  design  : ${DESIGN_ID}`);
console.log(`  piece   : ${PIECE_ID} (status=available, COGS=$${totalCOGS})`);
console.log(`  product : ${PRODUCT_ID} (jewelry, published, ready-to-ship; customizable slots: ${custom.join(', ')})`);
console.log(`  drop    : ${DROP_ID} (released; 1 member)`);
console.log(`  shop URL: /products/${PRODUCT_ID}   ·   drop: /drops/dev-e2e-drop`);
console.log('  viewer  : shop-safe (bindings + volumeCm3 stripped); glbUrl = efd_ring.glb (MinIO)');
await c.close();
