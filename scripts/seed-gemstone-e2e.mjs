/**
 * E2E seed for the gemstone testing walk (DEV DB ONLY — refuses any other MONGO_DB_NAME).
 *
 * Creates, idempotently (delete + reinsert by fixed ids):
 *   1. A gem DESIGN (two species variants: purchasable garnet with tiered rates + sg +
 *      maxPieces, and a special-request sapphire), edition limited 3.
 *   2. Its LISTING via the real buildProductFromDesign bridge (from-price floor with
 *      shared costs, aggregate public spec) — published so the shop renders it.
 *   3. A LOOSE STONE product (numeric inventory, qty 1) — published.
 *
 *   MONGODB_URI=... MONGO_DB_NAME=efd-database-DEV node scripts/seed-gemstone-e2e.mjs
 */
// NOTE: productContract.js is not importable here (its refrakt barrel import carries JSX
// the script loader can't parse), so the listing document mirrors buildProductFromDesign's
// gemstone branch — which productContract.test.js verifies against the same shape.
import { MongoClient } from 'mongodb';
import { gemstoneFromPrice, aggregateGemstoneSpec } from '../src/services/production/designCost.js';

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGO_DB_NAME || '';
if (!uri) throw new Error('MONGODB_URI is required.');
if (!/dev/i.test(dbName)) throw new Error(`Refusing to seed "${dbName}" — DEV databases only.`);

const DESIGN_ID = 'e2e-gem-design-aster';
const LISTING_ID = 'e2e-gem-listing-aster';
const STONE_ID = 'e2e-gem-loose-sunstone';

const design = {
  designID: DESIGN_ID,
  name: 'Aster Cut (E2E)',
  description: 'Test gem design for the gemstone testing walk.',
  category: 'gemstone',
  status: 'ready',
  primaryArtisanId: 'e2e-gem-cutter',
  stlVolumeCm3: 0.0755, // ≈1ct amethyst-density base; garnet base ≈ 1.47ct
  designModel: null,     // no GLB in the seed — the picker works without the 3D sizing
  gemstone: { cut: ['cushion'], cutStyle: ['brilliant'] },
  pricing: { markup: 2, laborTasks: [], shipping: [], designFee: { mode: 'waived', amount: null } },
  edition: { type: 'limited', limit: 3, allocated: 0, committed: 0, nextNumber: 1 },
  variants: [
    {
      variantId: 'e2e-var-garnet', sku: 'E2E-AST-1', active: true,
      gemstone: {
        species: 'Garnet', availability: 'purchase', caratMin: 1, caratMax: 4,
        naturalSynthetic: 'natural', clarity: 'eye clean', treatment: 'none',
        cutLaborCost: 60, yield: 0.25, maxPieces: 2, lotQty: null, sg: 3.9, sgOverride: null,
        colors: [
          { label: 'red AAA', rates: [{ upToCt: 2, ratePerCarat: 50 }, { upToCt: 4, ratePerCarat: 80 }] },
          { label: 'orange AA', rates: [{ upToCt: 4, ratePerCarat: 30 }] },
        ],
        ratesUpdatedAt: new Date().toISOString(),
      },
    },
    {
      variantId: 'e2e-var-sapphire', sku: 'E2E-AST-2', active: true,
      gemstone: {
        species: 'Sapphire', availability: 'special_request', caratMin: 0.5, caratMax: 3,
        naturalSynthetic: 'natural', clarity: null, treatment: 'unheated',
        cutLaborCost: 120, yield: 0.25, maxPieces: null, lotQty: null, sg: 4.0, sgOverride: null,
        colors: [],
      },
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

const client = new MongoClient(uri);
await client.connect();
try {
  const db = client.db(dbName);

  await db.collection('designs').deleteOne({ designID: DESIGN_ID });
  await db.collection('products').deleteMany({ productId: { $in: [LISTING_ID, STONE_ID] } });
  await db.collection('designs').insertOne(design);

  const gemPricing = { defaultMarkup: 2.5, sharedCosts: 0 }; // waived fee, no shared lines
  const gemFrom = gemstoneFromPrice(design, gemPricing);
  const seller = { userId: 'e2e-gem-cutter', displayName: 'Aster Gems (E2E)', artisanType: 'Gem Cutter' };
  const listing = {
    productId: LISTING_ID,
    productType: 'gemstone',
    listingType: 'gemstone',
    title: design.name,
    description: design.description,
    availability: 'made-to-order',
    status: 'draft',
    pricing: { retailPrice: gemFrom, priceIsFrom: true, compareAtPrice: null, costBasis: 0, costBasisSource: 'estimated', currency: 'USD' },
    gemstone: aggregateGemstoneSpec(design),
    designId: design.designID,
    references: { designId: design.designID, pieceID: null, gemstoneId: null },
    pieceIDs: [],
    userId: seller.userId,
    vendor: seller.displayName,
    seller,
    images: ['https://placehold.co/800x800/1a1028/e0c3fc.png?text=Aster+Cut'],
    viewer: null,
    publishing: { visible: true, featured: false, publishedAt: new Date() },
    createdBy: 'seed-gemstone-e2e',
  };
  const now = new Date();
  await db.collection('products').insertOne({ ...listing, status: 'published', isPublic: true, createdAt: now, updatedAt: now });
  await db.collection('designs').updateOne({ designID: DESIGN_ID }, { $set: { productID: LISTING_ID } });

  await db.collection('products').insertOne({
    productId: STONE_ID,
    productType: 'gemstone',
    listingType: 'gemstone',
    title: 'Oregon Sunstone 2.1ct (E2E)',
    description: 'Test loose stone for the gemstone testing walk.',
    availability: 'ready-to-ship',
    status: 'published',
    isPublic: true,
    designId: null,
    userId: 'e2e-gem-cutter',
    vendor: 'Aster Gems (E2E)',
    seller: { userId: 'e2e-gem-cutter', displayName: 'Aster Gems (E2E)', artisanType: 'Gem Cutter' },
    pricing: { retailPrice: 420, compareAtPrice: null, costBasis: 120, costBasisSource: 'actual', currency: 'USD' },
    gemstone: {
      species: 'Sunstone', subspecies: 'Oregon Sunstone', carat: 2.1,
      dimensions: { length: 8.2, width: 6.4, height: 4.9 },
      cut: ['oval'], cutStyle: ['brilliant'], color: ['copper schiller'], clarity: 'eye clean',
      treatment: [], locale: 'Oregon, USA', naturalSynthetic: 'natural',
      certification: { lab: '', number: '', url: '', verified: false },
      acquisitionPrice: 120, acquisitionDate: '2026-08-01', supplier: 'E2E Rough Co.',
    },
    inventory: { quantity: 1, reserved: 0, available: 1, usedInProductId: null },
    images: ['https://placehold.co/800x800/2a1a05/ffd9a0.png?text=Oregon+Sunstone'],
    publishing: { visible: true, featured: false, publishedAt: now },
    createdAt: now,
    updatedAt: now,
  });

  const from = gemFrom;
  console.log(`Seeded ${dbName}:`);
  console.log(`  design   ${DESIGN_ID} (limited 3; garnet purchasable, sapphire by request)`);
  console.log(`  listing  ${LISTING_ID} — from $${listing.pricing.retailPrice} (recomputed check: $${from})`);
  console.log(`  stone    ${STONE_ID} — $420, qty 1 (acquisition fields present to test the strip)`);
} finally {
  await client.close();
}
