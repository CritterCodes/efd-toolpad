import { randomUUID } from 'crypto';
import { db } from '@/lib/database';
import DesignsModel, { EDITION_TYPE, PRODUCTION_METHOD } from '@/app/api/designs/model';
import PiecesModel, { PIECE_STATUS } from '@/app/api/pieces/model';

/**
 * Phase 1 migration — elevate legacy `products/productType:'gemstone'` LISTINGS into first-class
 * gemstone **Designs** (+ one cut Piece), reusing the production engine.
 *
 * Each listing is a single physical cut stone, so it maps to:
 *   - a Design  { category:'gemstone', edition: one_of_one (allocated:1), status:'ready',
 *                 productionMethod:'handmade', gemstone:{…the spec…}, one rough/cut variant }
 *   - a Piece   { status:'available' (RTS) — the stone exists, editionNumber:1 }
 *   - links     design.gemstoneId → listing.productId (flywheel); listing.references.designId +
 *               pieceID + pieceIDs → the new Design/Piece (so the storefront listing is now backed
 *               by the production model without changing what it sells).
 *
 * IDEMPOTENT: a listing already carrying `references.designId` (or with a Design whose
 * gemstoneId === its productId) is skipped. Pass { dryRun:true } to preview with zero writes.
 */
/**
 * PURE mapping — a `products/gemstone` listing → the gemstone Design spec + Piece plan. No DB.
 * (variantId is generated here so the returned spec is self-contained.) Unit-tested directly.
 */
export function planGemstoneMigration(listing = {}) {
  const productId = listing.productId || listing._id?.toString() || null;
  const g = listing.gemstone || {};
  const species = g.species || listing.title || 'Gemstone';
  const carat = Number(g.carat) || null;
  const dims = g.dimensions || null;
  const retail = Number(listing.pricing?.retailPrice ?? g.retailPrice) || null;
  const cost = Number(listing.pricing?.costBasis ?? g.acquisitionPrice) || null;
  const naturalSynthetic = g.naturalSynthetic || 'natural';

  const variantId = randomUUID();
  const sku = `GEM-${productId}`; // unique across designs (unique-sparse variants.sku)
  // A gemstone variant is a rough/cut lot: quality + size, NO ring sizing/metal.
  const variant = {
    variantId,
    sku,
    active: true,
    quality: g.clarity || null,
    caratEach: carat,
    sizeMm: dims ? `${dims.length || ''}${dims.width ? ` x ${dims.width}` : ''}${dims.height ? ` x ${dims.height}` : ''} mm`.trim() : null,
    roughQty: 1,
    pricing: { retailPrice: retail },
    leadTimeDays: null,
  };
  const gemstone = {
    species,
    subspecies: g.subspecies || '',
    carat,
    dimensions: dims,
    cut: g.cut || [],
    cutStyle: g.cutStyle || [],
    treatment: g.treatment || [],
    color: g.color || [],
    clarity: g.clarity || '',
    locale: g.locale || '',
    naturalSynthetic,
    certification: g.certification || null,
  };
  const designSpec = {
    gemstoneId: productId, // flywheel back-link to the originating listing
    name: listing.title || species,
    description: listing.description ?? null,
    category: 'gemstone',
    productionMethod: PRODUCTION_METHOD.HANDMADE,
    status: 'ready',
    edition: { type: EDITION_TYPE.ONE_OF_ONE, allocated: 1, committed: 0, nextNumber: 2 },
    variants: [variant],
    gemstone,
    referenceImages: Array.isArray(listing.images) ? listing.images : [],
    estCost: cost,
    suggestedRetail: retail,
    primaryArtisanId: listing.seller?.userId || listing.userId || null,
    metadata: { migratedFrom: 'products/gemstone', internalNotes: listing.internalNotes || '' },
    createdBy: 'migration:gemstone-designs-p1',
  };
  // The stone physically exists → an already-cut Piece. Available unless the listing says otherwise.
  const pieceStatus = (listing.inventory?.available === false || listing.inventory?.reserved)
    ? PIECE_STATUS.RESERVED : PIECE_STATUS.AVAILABLE;

  return {
    productId,
    variantId,
    sku,
    designSpec,
    pieceStatus,
    resolvedConfiguration: { species, carat, dimensions: dims, cut: gemstone.cut, color: gemstone.color, clarity: gemstone.clarity, naturalSynthetic },
  };
}

export async function migrateGemstoneListingsToDesigns({ dryRun = true } = {}) {
  const database = await db.connect();
  const products = database.collection('products');
  const designs = await DesignsModel.collection();

  const listings = await products.find({ productType: 'gemstone' }).toArray();

  const planned = [];
  const skipped = [];
  let migrated = 0;

  for (const listing of listings) {
    const productId = listing.productId || listing._id?.toString();
    // Idempotency: already linked, or a design already points back to this listing.
    const already = listing.references?.designId
      || (await designs.findOne({ gemstoneId: productId }, { projection: { designID: 1 } }));
    if (already) { skipped.push({ productId, reason: 'already migrated' }); continue; }

    const plan = planGemstoneMigration(listing);
    planned.push({ productId, name: plan.designSpec.name, species: plan.designSpec.gemstone.species, carat: plan.designSpec.gemstone.carat, retail: plan.designSpec.suggestedRetail, variantSku: plan.sku, pieceStatus: plan.pieceStatus });

    if (dryRun) continue;

    // ---- writes ----
    const design = await DesignsModel.create(plan.designSpec);
    const piece = await PiecesModel.create({
      designID: design.designID,
      variantId: plan.variantId,
      resolvedConfiguration: plan.resolvedConfiguration,
      editionNumber: 1,
      gemstoneId: productId,
      sku: plan.sku,
      status: plan.pieceStatus,
      productID: productId,
      dimensions: plan.designSpec.gemstone.dimensions,
      createdBy: 'migration:gemstone-designs-p1',
    });
    await products.updateOne(
      { _id: listing._id },
      { $set: { 'references.designId': design.designID, 'references.pieceID': piece.pieceID, pieceIDs: [piece.pieceID], updatedAt: new Date() } },
    );
    migrated += 1;
  }

  return {
    dryRun,
    totalListings: listings.length,
    toMigrate: planned.length,
    skipped: skipped.length,
    migrated,
    plannedSample: planned.slice(0, 20),
    skippedSample: skipped.slice(0, 10),
  };
}
