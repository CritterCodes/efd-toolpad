/**
 * Seed a customizable DEV `designID` — the standing @admin ask from thread #156/#157/#158.
 *
 * Creates (idempotent upsert, stable designID) a production Design whose `viewer.meshMap`
 * carries refrakt-native `customizable` blocks + per-option admin **cost bindings** (0005 §6),
 * so:
 *   - refrakt `readCustomizableSlots(config)` gates the Customizer ON (shop's UX gate, #158), and
 *   - admin's `POST /api/refrakt-price` can resolve every chosen option → a binding (no 422).
 *
 * WHAT THIS SCRIPT CANNOT DO FROM HEADLESS: it cannot render a GLB, so it cannot capture the
 * per-slot `volumeCm3` nor empirically pin `modelUnit` (cm vs m — the 10^6x trap, refrakt #144/#151).
 * Those are the ONLY inputs a loop tick can't produce. Supply them once the owner renders the GLB
 * in the authoring screen (/dashboard/production/designs/[designID]/customize):
 *
 *   SEED_GLB_URL   (required-ish)  the real GLB asset URL (MinIO/CDN). Without it the design is
 *                                  seeded UNRENDERABLE and the Customizer stays gated OFF for lack
 *                                  of a glbUrl — pricing plumbing is still exercisable via the API.
 *   SEED_MODEL_UNIT  'cm' | 'm'    the GLB's authoring unit, pinned empirically (default: null = UNPINNED)
 *   SEED_BAND_VOL_CM3  number      per-slot metal volume for the Band slot (default: null = metal line unpriceable)
 *
 * Usage (Node 20.6+):
 *   node --env-file=.env.local \
 *     -e "process.env.SEED_GLB_URL='https://.../ring.glb';process.env.SEED_MODEL_UNIT='cm';process.env.SEED_BAND_VOL_CM3='0.42'" \
 *     scripts/seed-customizable-design.mjs
 *   # or just: SEED_GLB_URL=... node --env-file=.env.local scripts/seed-customizable-design.mjs
 *
 * Safety: refuses to write into production (`efd-database`). Idempotent (upsert by designID).
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { MongoClient } from 'mongodb';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { annotateBindings, customizableSlots, unboundSlots } from '../src/services/production/customizableBindings.js';
import { storageClient, STORAGE_BUCKET, storageUrl } from '../src/lib/storage.js';
// Import the PURE data-layer module directly (the barrel pulls JSX components node can't parse).
import { readCustomizableSlots } from '../node_modules/@crittercodes/refrakt/src/customizer/selection.js';

const URI = process.env.MONGODB_URI;
const DB = process.env.MONGO_DB_NAME;
const die = (m) => { console.error(`✖ ${m}`); process.exit(1); };
if (!URI) die('MONGODB_URI required (run with --env-file=.env.local).');
if (!DB) die('MONGO_DB_NAME required.');
if (/^efd-database$/i.test(DB)) die(`Refusing to seed into production ("${DB}"). This is a DEV-only seed.`);

const DESIGN_ID = 'dev-customizable-seed-01';
let GLB_URL = process.env.SEED_GLB_URL || null;
const GLB_LOCAL = process.env.SEED_GLB_LOCAL || null;             // local .glb path to upload to MinIO
const MODEL_UNIT = process.env.SEED_MODEL_UNIT || null;            // 'cm' | 'm' | null(unpinned)
const BAND_VOL = process.env.SEED_BAND_VOL_CM3 ? Number(process.env.SEED_BAND_VOL_CM3) : null;

// If a local GLB is given (and no explicit URL), upload it to MinIO and use that as glbUrl.
if (!GLB_URL && GLB_LOCAL) {
  if (!STORAGE_BUCKET) die('No storage bucket configured (MINIO_BUCKET) — cannot upload GLB.');
  const body = readFileSync(GLB_LOCAL);
  const key = `production/designs/${DESIGN_ID}/${basename(GLB_LOCAL)}`;
  await storageClient.send(new PutObjectCommand({
    Bucket: STORAGE_BUCKET, Key: key, Body: body, ContentType: 'model/gltf-binary',
  }));
  GLB_URL = storageUrl(key);
  console.log(`✓ Uploaded ${basename(GLB_LOCAL)} (${(body.length / 1024).toFixed(0)} KB) → MinIO ${STORAGE_BUCKET}/${key}`);
  console.log(`  glbUrl = ${GLB_URL}`);
}

// Base customizable meshMap (refrakt-native) — nameContains MUST match real GLB meshes.
// For the bundled sample `efd_ring.glb`: metal = `Ring_Mounting` (mat EFD_YellowGold_18k),
// center = `Gem_Amethyst`, accent melee = `BrilliantCut_Unit.*` (fixed). Option vocab is
// visual-only (finish/gemPreset); admin cost bindings are merged in below.
// nameContains use the substring keys refrakt's `computeSlotVolumes` matches in the LOADED scene
// (#162): metal mesh resolves as `mounting`, gems as `amethyst`/`diamond`. Substrings so the authoring
// screen auto-reads volume (best E2E signal) — not the raw GLB mesh names (`Ring_Mounting`, etc.).
const baseMeshMap = [
  {
    nameContains: 'mounting', match: 'contains', type: 'metal', finish: 'yellow',
    ...(BAND_VOL != null ? { volumeCm3: BAND_VOL } : {}),   // admin-internal; stripped from shop reads
    customizable: {
      label: 'Band metal', default: 'yellow',
      options: [{ finish: 'yellow' }, { finish: 'white' }, { finish: 'rose' }],
    },
  },
  {
    nameContains: 'amethyst', match: 'contains', type: 'gem', gemPreset: 'amethyst',
    customizable: {
      // default is a *bound* option (not the amethyst base) so the initial resolvedMeshMap prices (no 422).
      label: 'Center stone', default: 'diamond',
      options: [{ gemPreset: 'diamond' }, { gemPreset: 'moissanite' }, { gemPreset: 'sapphire' }],
    },
  },
  { nameContains: 'diamond', match: 'contains', type: 'gem', gemPreset: 'diamond' }, // FIXED accent melee
];

// Admin cost bindings (0005 §6): metal option -> { metalKey }; gem option -> { gemstoneId }.
// NOTE: metalKey values are ILLUSTRATIVE (efd-db-migrate materials have no clean metalKey yet); gemstoneId
// values ARE real docs in this DB. Point metalKeys at real materials.stullerProducts[].metalKey once loaded.
const bindings = {
  mounting: {
    yellow: { metalKey: 'GOLD_18K_YELLOW' },
    white: { metalKey: 'GOLD_18K_WHITE' },
    rose: { metalKey: 'GOLD_18K_RED' },   // METAL_TYPES uses RED for rose/red gold (no _ROSE key)
  },
  amethyst: {
    diamond: { gemstoneId: '68fa4353314a1a049cacd633', carat: 1.0 },   // "Natural Diamonds"
    moissanite: { gemstoneId: '68fa4353314a1a049cacd635', carat: 1.0 },// "Moissanite"
    sapphire: { gemstoneId: '68fa4353314a1a049cacd636', carat: 1.2 },  // "Sapphire"
  },
};

const meshMap = annotateBindings(baseMeshMap, bindings);
const viewer = { ...(GLB_URL ? { glbUrl: GLB_URL } : {}), meshMap, ...(MODEL_UNIT ? { modelUnit: MODEL_UNIT } : {}) };

const now = new Date();
const doc = {
  designID: DESIGN_ID,
  gemstoneId: '68fa4353314a1a049cacd633',
  dropID: null,
  name: '[DEV] Customizable Solitaire (seed)',
  description: 'Seeded customizable design for Customizer/live-pricing verification (thread #156–#158). Metal+gem customizable slots with admin cost bindings.',
  designerUserID: null,
  cadFiles: [], renders: [], referenceImages: [],
  stlVolumeCm3: BAND_VOL,
  metalOptions: [], bom: { castingEstimate: 0, stones: [], findings: [], estMaterialCost: 0 },
  routing: [], estCost: null, suggestedRetail: null, productID: null,
  viewer,
  status: 'concept',
  updatedAt: now,
  createdBy: 'seed-customizable-design.mjs',
};

const c = new MongoClient(URI);
await c.connect();
const col = c.db(DB).collection('designs');
const res = await col.updateOne(
  { designID: DESIGN_ID },
  { $set: doc, $setOnInsert: { createdAt: now } },
  { upsert: true },
);
console.log(`✓ Seeded design "${DESIGN_ID}" into ${DB}.designs (${res.upsertedCount ? 'inserted' : 'updated'}).`);

// Contract self-checks against the SHIPPED refrakt helper + admin binding resolver.
const gated = readCustomizableSlots(viewer);
console.log(`✓ refrakt readCustomizableSlots(): ${gated.length} customizable slot(s) -> ${gated.map((s) => s.slot).join(', ')}`);
console.log(`✓ admin customizableSlots(): ${customizableSlots(meshMap).map((s) => s.nameContains).join(', ')}`);
const unbound = unboundSlots(meshMap);
console.log(unbound.length ? `⚠ UNBOUND slots (would 422): ${unbound.join(', ')}` : '✓ all customizable options are cost-bound (no 422).');
console.log(`✓ Customizer gate (glbUrl && slots>0): ${Boolean(GLB_URL) && gated.length > 0 ? 'ON' : `OFF${GLB_URL ? '' : ' (no SEED_GLB_URL)'}`}`);
console.log(`  modelUnit: ${MODEL_UNIT ?? 'UNPINNED (owner must render + pin cm/m)'}; Band volumeCm3: ${BAND_VOL ?? 'UNSET (metal line unpriceable until rendered)'}`);
await c.close();
