/**
 * Listing sync — the orchestrator (P1 of PRODUCTS_ARE_PROJECTIONS.md).
 *
 * `syncDesignListing(designID)` makes the shop-read product doc a faithful projection
 * of the Design + its Pieces: it adopts the design's existing product (by
 * `primaryProductId`, else by reference), materializes a draft via
 * `buildProductFromDesign` when none exists, then applies the pure
 * `computeListingUpdate` $set. Idempotent; safe to call after any design/piece write.
 *
 * Trigger points (all best-effort — a sync hiccup must never fail the user's write):
 * design create/update routes, piece update/start routes, the daily repricer, and the
 * manual POST /api/production/listing-sync sweep.
 */
import { db } from '@/lib/database';
import DesignsModel from '@/app/api/designs/model';
import PiecesModel from '@/app/api/pieces/model';
import { buildProductFromDesign, validateProductContract } from '@/services/products/productContract';
import { computeListingUpdate } from '@/services/production/listingSyncCore';

async function sellerForArtisan(dbi, userID) {
  if (!userID) return null;
  const owner = await dbi.collection('users').findOne(
    { userID },
    { projection: { userID: 1, firstName: 1, lastName: 1, artisanApplication: 1 } },
  );
  if (!owner) return null;
  return {
    userId: owner.userID,
    displayName: owner.artisanApplication?.businessName
      || [owner.firstName, owner.lastName].filter(Boolean).join(' '),
    artisanType: owner.artisanApplication?.artisanType ?? null,
  };
}

/**
 * Sync one design's listing. Returns a report, never throws for data problems.
 * @param {string} designID
 * @param {{ dryRun?: boolean }} opts
 */
export async function syncDesignListing(designID, { dryRun = false } = {}) {
  const design = await DesignsModel.findById(designID);
  if (!design) return { designID, action: 'skipped', reason: 'design not found' };

  const pieces = await PiecesModel.findByDesign(designID);
  const dbi = await db.connect();
  const products = dbi.collection('products');

  // Adopt an existing listing under ANY of the historical link fields before creating one.
  // `primaryProductId` (data-model canon) and `productID` (written by list-concept) both
  // exist in the wild: looking at only one of them made this engine mint a SECOND product
  // for a design that was already listed (seen in prod on "Tracks Band").
  const handle = design.primaryProductId || design.productID || null;
  let product = handle ? await products.findOne({ productId: handle }) : null;
  if (!product) {
    product = await products.findOne(
      { $or: [{ 'references.designId': design.designID }, { designId: design.designID }] },
      { sort: { createdAt: 1 } },
    );
  }

  let created = false;
  if (!product) {
    const seller = await sellerForArtisan(dbi, design.primaryArtisanId);
    product = buildProductFromDesign({
      design,
      estCost: design.estCost || 0,
      opts: {
        seller,
        userId: seller?.userId ?? null,
        vendor: seller?.displayName ?? null,
        createdBy: 'listingSync',
      },
    });
    created = true;
    if (!dryRun) {
      const now = new Date();
      await products.insertOne({ ...product, createdAt: now, updatedAt: now });
    }
  }

  const result = computeListingUpdate({ design, pieces, product, validate: validateProductContract });
  if (result.action === 'blocked') {
    return { designID, productId: product.productId, action: 'blocked', violations: result.violations };
  }

  if (!dryRun) {
    await products.updateOne(
      { productId: product.productId },
      { $set: { ...result.set, updatedAt: new Date() } },
    );
    // Keep BOTH link fields pointed at the one listing — `productID` is what the design
    // detail page's "View listing" reads, `primaryProductId` is the canonical name.
    if (design.primaryProductId !== product.productId || design.productID !== product.productId) {
      await DesignsModel.updateById(design.designID, {
        primaryProductId: product.productId,
        productID: product.productId,
      });
    }
  }

  return {
    designID,
    productId: product.productId,
    action: created ? 'created' : 'updated',
    publishBlocked: result.publishBlocked,
    violations: result.violations,
  };
}

/** Best-effort variant for write-route hooks: log-and-continue, never break the caller. */
export async function syncDesignListingSafe(designID, opts = {}) {
  try {
    return await syncDesignListing(designID, opts);
  } catch (err) {
    console.error(`listingSync: sync failed for design ${designID}:`, err);
    return { designID, action: 'error', reason: err.message };
  }
}

export async function syncListingsForDesigns(designIDs = [], opts = {}) {
  const reports = [];
  for (const id of [...new Set(designIDs)].filter(Boolean)) {
    reports.push(await syncDesignListingSafe(id, opts));
  }
  return reports;
}

/** The self-healing sweep — every projection can always be rebuilt from scratch. */
export async function syncAllListings(opts = {}) {
  const designs = await DesignsModel.list();
  const reports = await syncListingsForDesigns(designs.map((d) => d.designID), opts);
  const by = (action) => reports.filter((r) => r.action === action).length;
  return {
    scanned: reports.length,
    created: by('created'),
    updated: by('updated'),
    blocked: by('blocked'),
    errors: by('error'),
    skipped: by('skipped'),
    reports,
  };
}
