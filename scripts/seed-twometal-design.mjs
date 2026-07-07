/**
 * Seed a SYNTHETIC two-metal DEV design — the fixture for the ≥2-metal route-level HTTP test
 * (#189/#196), proving `/api/refrakt-price` prices each metal slot off its OWN `volumeCm3` and does
 * NOT double-count the whole-model `stlVolumeCm3` (the #187 bug). No 2-metal GLB needed: pricing joins
 * `resolvedMeshMap` → the design meshMap by `nameContains`, so an authored 2-metal meshMap is enough.
 *
 * Two metal slots: band (volumeCm3 10, GOLD_18K_YELLOW) + prongs (volumeCm3 2, GOLD_18K_WHITE);
 * whole-model stlVolumeCm3 = 999 (deliberately ≠ any slot, so a regression to whole-model is obvious).
 *
 * Usage: node --env-file=.env.local scripts/seed-twometal-design.mjs   (DEV-guarded; refuses prod)
 */
import { MongoClient } from 'mongodb';
import { annotateBindings, unboundSlots } from '../src/services/production/customizableBindings.js';

const URI = process.env.MONGODB_URI;
const DB = process.env.MONGO_DB_NAME;
const die = (m) => { console.error(`✖ ${m}`); process.exit(1); };
if (!URI) die('MONGODB_URI required (--env-file=.env.local).');
if (!DB) die('MONGO_DB_NAME required.');
if (/^efd-database$/i.test(DB)) die(`Refusing to seed into production ("${DB}").`);

const DESIGN_ID = 'dev-2metal-seed-01';

const baseMeshMap = [
  { nameContains: 'band', match: 'contains', type: 'metal', finish: 'yellow', volumeCm3: 10,
    customizable: { label: 'Band metal', default: 'yellow', options: [{ finish: 'yellow' }] } },
  { nameContains: 'prongs', match: 'contains', type: 'metal', finish: 'white', volumeCm3: 2,
    customizable: { label: 'Prong metal', default: 'white', options: [{ finish: 'white' }] } },
];
const bindings = {
  band: { yellow: { metalKey: 'GOLD_18K_YELLOW' } },
  prongs: { white: { metalKey: 'GOLD_18K_WHITE' } },
};
const meshMap = annotateBindings(baseMeshMap, bindings);

const now = new Date();
const doc = {
  designID: DESIGN_ID,
  gemstoneId: null, dropID: null,
  name: '[DEV] Two-metal fixture (band+prongs)',
  description: 'Synthetic 2-metal design for the per-slot metal-pricing route test (#187/#196). band 10cm³ + prongs 2cm³; stlVolumeCm3 999.',
  cadFiles: [], renders: [], referenceImages: [],
  stlVolumeCm3: 999,   // whole-model — must be IGNORED per-slot
  metalOptions: [], bom: { castingEstimate: 0, stones: [], findings: [], estMaterialCost: 0 },
  routing: [], estCost: null, suggestedRetail: null, productID: null,
  viewer: { meshMap },   // no glbUrl — pricing doesn't need one; this is a pricing fixture
  status: 'concept',
  updatedAt: now,
  createdBy: 'seed-twometal-design.mjs',
};

const c = new MongoClient(URI);
await c.connect();
const res = await c.db(DB).collection('designs').updateOne(
  { designID: DESIGN_ID }, { $set: doc, $setOnInsert: { createdAt: now } }, { upsert: true },
);
console.log(`✓ Seeded "${DESIGN_ID}" into ${DB}.designs (${res.upsertedCount ? 'inserted' : 'updated'}).`);
const unbound = unboundSlots(meshMap);
console.log(unbound.length ? `⚠ UNBOUND: ${unbound.join(', ')}` : '✓ both metal slots cost-bound (no 422).');
console.log('  band volumeCm3=10 (GOLD_18K_YELLOW), prongs volumeCm3=2 (GOLD_18K_WHITE), stlVolumeCm3=999.');
await c.close();
