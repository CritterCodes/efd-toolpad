/**
 * Drop release engine (PRODUCTS_ARE_PROJECTIONS.md §5.4 + data-model.md `drops`).
 *
 * Releasing a Drop resolves its Designs by `design.dropId`, checks each one is actually
 * sellable, flips `design.listing.published` on the eligible set, and re-projects their
 * listings through the sync engine — which is what makes them visible to efd-shop
 * (the storefront reads `status: 'published'` / `isPublic`). Then the Drop is marked released.
 *
 * Before this existed, "release" was a status dropdown: it wrote `status: 'released'` on the
 * drop document and nothing else ever happened, so the shop never saw the drop's work.
 *
 * At least one eligible listing is required (data-model.md): releasing a drop where every
 * design is blocked is refused with a per-design reason, never a silent no-op.
 */
import { db } from '@/lib/database';
import DropsModel, { DROP_STATUS } from '@/app/api/drops/model';
import DesignsModel from '@/app/api/designs/model';
import { syncDesignListing } from '@/services/production/listingSync';
import { loadPricingInputs, priceDesignVariants } from '@/services/production/dailyReprice';

/** Parse a `releaseAt` that may be a Date or a legacy datetime-local string. */
export function parseReleaseAt(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Why a design can or cannot be listed. Pure — the reasons are the whole point: a drop that
 * refuses to release must say which design is holding it and what to fix.
 * @returns {{ designID, name, eligible: boolean, reasons: string[] }}
 */
export function designReleaseReadiness(design, { product = null } = {}) {
  const reasons = [];
  const variants = Array.isArray(design?.variants) ? design.variants : [];
  const active = variants.filter((v) => v.active);

  if (!variants.length) {
    reasons.push('no variants — build at least one variant before releasing');
  } else if (!active.length) {
    // The REFRAKT studio creates variant stubs INACTIVE ("until its look is built + specs
    // confirmed"). Nothing else surfaces that, so a design looks finished and lists empty.
    reasons.push(`no ACTIVE variant (${variants.length} inactive) — open each variant and switch it to Active`);
  }

  // Price. Variant retail is a CALCULATED recipe (never hand-authored), and release computes
  // it from today's metal — so the question is not "does it have a price?" but "can one be
  // computed?". A design that merely has not been priced YET is releasable; one whose recipe
  // cannot produce a number (no STL volume, no metal on any active variant) is not.
  const priced = active.some((v) => Number(v?.pricing?.retailPrice) > 0 || Number(v?.price) > 0)
    || Number(product?.pricing?.retailPrice) > 0;
  const isGem = design?.category === 'gemstone';
  const gemPriceable = isGem && active.some((v) => (v?.gemstone?.colors || []).some((c) => (c.rates || []).length));
  const jewelryPriceable = !isGem
    && Number(design?.stlVolumeCm3) > 0
    && active.some((v) => v.metalKey);
  if (active.length && !priced && !gemPriceable && !jewelryPriceable) {
    reasons.push(isGem
      ? 'no price — add rate tiers to an active variant (or a flat price) before releasing'
      : 'cannot compute a price — the design needs an STL volume (CAD tab) and a metal on an active variant');
  }

  const hasMedia = (Array.isArray(product?.images) && product.images.length > 0)
    || Boolean(product?.viewer?.glbUrl)
    || Boolean(design?.designModel?.glbUrl)
    || (Array.isArray(design?.referenceImages) && design.referenceImages.length > 0);
  if (!hasMedia) reasons.push('no media — add a photo or a GLB before releasing');

  return {
    designID: design?.designID ?? null,
    name: design?.name ?? 'Untitled design',
    eligible: reasons.length === 0,
    reasons,
  };
}

/** Load a drop's designs plus their current listing docs. */
async function loadDropDesigns(dropId) {
  const dbi = await db.connect();
  const designs = await DesignsModel.list({ dropId });
  const ids = designs.map((d) => d.primaryProductId || d.productID).filter(Boolean);
  const products = ids.length
    ? await dbi.collection('products').find({ productId: { $in: ids } }).toArray()
    : [];
  const byId = new Map(products.map((p) => [p.productId, p]));
  return designs.map((design) => ({
    design,
    product: byId.get(design.primaryProductId) || byId.get(design.productID) || null,
  }));
}

/**
 * What would happen if this drop were released right now.
 * @returns {{ dropId, name, status, designCount, eligible: [], blocked: [], canRelease: boolean }}
 */
export async function preflightDrop(dropId) {
  const drop = await DropsModel.findById(dropId);
  if (!drop) return { error: 'Drop not found.' };

  const pairs = await loadDropDesigns(dropId);
  const readiness = pairs.map(({ design, product }) => designReleaseReadiness(design, { product }));
  const eligible = readiness.filter((r) => r.eligible);
  const blocked = readiness.filter((r) => !r.eligible);

  return {
    dropId: drop.dropId,
    name: drop.name,
    status: drop.status,
    releaseAt: drop.releaseAt ?? null,
    designCount: readiness.length,
    eligible,
    blocked,
    canRelease: eligible.length > 0,
    ...(readiness.length === 0
      ? { reason: 'this drop has no designs — add a design to it first' }
      : eligible.length === 0
        ? { reason: 'every design in this drop is blocked — see `blocked` for what to fix' }
        : {}),
  };
}

/**
 * Build the shop's read-model doc for a released drop.
 *
 * WHY THIS EXISTS: efd-shop renders every drop surface — `/drops/[slug]` and the Drops tab on
 * `/collections` — from the `collections` collection, because it was built when "a Drop is a
 * Collection with a release facet" (its own comment, decisions/0003). Admin has since moved to a
 * separate `drops` collection per the owner's July-17 ruling that Drops and Collections are
 * different things. Nothing bridged the two, so a released drop published its products (they show
 * under All Pieces) but the drop itself never appeared anywhere.
 *
 * So: `drops` stays the source of truth and this is a PROJECTION of it in the shape the storefront
 * reads — the same pattern as products (PRODUCTS_ARE_PROJECTIONS.md). It is stamped with
 * `projection.engine` + `dropId` so it is recognisable as generated, and `kind: 'drop'` so the shop
 * files it under the Drops tab. When the shop is moved onto `drops` directly, delete this.
 */
export function buildDropReadModel({ drop, members = [], releasedAt = new Date() }) {
  return {
    collectionId: `drop-${drop.dropId}`,
    slug: drop.slug,
    name: drop.name,
    title: drop.name,
    description: drop.description ?? '',
    kind: 'drop',
    status: DROP_STATUS.RELEASED,
    releasedAt,
    members: members.map((productId, position) => ({ productId, position })),
    heroImage: drop.heroImage ?? null,
    image: drop.heroImage ?? drop.thumbnail ?? null,
    thumbnail: drop.thumbnail ?? null,
    ownerType: drop.ownerType ?? 'efd',
    ownerInfo: drop.ownerInfo ?? null,
    seo: drop.seo ?? {},
    projection: { engine: 'dropRelease@1', dropId: drop.dropId, syncedAt: new Date() },
  };
}

/**
 * Order the drop's published listings: the curator's `designOrder` first, then anything else.
 */
export function orderDropMembers({ designOrder = [], published = [] }) {
  const byDesign = new Map(published.filter((p) => p.productId).map((p) => [p.designID, p.productId]));
  const ordered = [];
  for (const designID of designOrder || []) {
    if (byDesign.has(designID)) { ordered.push(byDesign.get(designID)); byDesign.delete(designID); }
  }
  return [...ordered, ...byDesign.values()];
}

/** Upsert the shop read-model, refusing to trample a hand-authored Collection on the same slug. */
async function projectDropToShop({ drop, published, releasedAt }) {
  const dbi = await db.connect();
  const collections = dbi.collection('collections');
  const existing = await collections.findOne({ $or: [{ collectionId: `drop-${drop.dropId}` }, { slug: drop.slug }] });
  if (existing && existing.projection?.dropId && existing.projection.dropId !== drop.dropId) {
    return { ok: false, reason: `slug "${drop.slug}" already belongs to another drop projection` };
  }
  if (existing && !existing.projection?.engine) {
    // A real, human-made Collection owns this slug. Never overwrite it.
    return { ok: false, reason: `slug "${drop.slug}" is taken by an existing collection — rename the drop's slug` };
  }
  const doc = buildDropReadModel({
    drop,
    members: orderDropMembers({ designOrder: drop.designOrder, published }),
    releasedAt,
  });
  await collections.updateOne(
    { collectionId: doc.collectionId },
    { $set: { ...doc, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );
  return { ok: true, collectionId: doc.collectionId, slug: doc.slug, members: doc.members.length };
}

/**
 * Release a drop: publish the eligible designs' listings, then mark the drop released.
 * Idempotent — re-releasing re-syncs and republishes without duplicating anything.
 *
 * @param {string} dropId
 * @param {{ dryRun?: boolean, releasedBy?: string, force?: boolean }} opts
 */
export async function releaseDrop(dropId, { dryRun = false, releasedBy = null, force = false } = {}) {
  const pre = await preflightDrop(dropId);
  if (pre.error) return { ok: false, error: pre.error };
  if (!pre.canRelease && !force) {
    return { ok: false, error: pre.reason || 'nothing in this drop can be released.', ...pre };
  }

  const published = [];
  const failed = [];
  const repriced = [];
  let shopProjection = null;
  if (!dryRun) {
    // Price the release before publishing it. Variant retail is a CALCULATED recipe that is
    // never authored by hand, and the daily repricer only scans listings the shop can already
    // see — so a design on its way live has a null price and nothing to fill it. That was a
    // deadlock: unpublished => never priced => not releasable. Pricing here, with the same
    // recipe the cron uses, is what breaks it; the cron keeps it fresh afterwards.
    const inputs = await loadPricingInputs().catch(() => null);
    for (const item of pre.eligible) {
      if (!inputs?.hasRates) break;
      const design = await DesignsModel.findById(item.designID);
      if (!design || design.category === 'gemstone') continue; // gem listings price per carat
      const needsPrice = (design.variants || []).some(
        (v) => v.active && !(Number(v?.pricing?.retailPrice) > 0) && !(Number(v?.price) > 0),
      );
      if (!needsPrice) continue;
      const priced = priceDesignVariants({
        design,
        rates: inputs.rates,
        stoneCosts: inputs.stoneCosts,
        taskCosts: inputs.taskCosts,
        artisanFee: inputs.artisanFees[design.primaryArtisanId] || 0,
        defaultMarkup: inputs.defaultMarkup,
      });
      if (!priced.ok) { repriced.push({ designID: item.designID, ok: false, reason: priced.reason }); continue; }
      for (const v of priced.variants.filter((x) => x.ok)) {
        await dropDb().then((dbi) => dbi.collection('designs').updateOne(
          { designID: item.designID },
          {
            $set: {
              'variants.$[v].price': v.retail,
              'variants.$[v].pricing.retailPrice': v.retail,
              'variants.$[v].pricing.costBasis': v.cog,
              'variants.$[v].pricing.pricedAt': new Date(),
              updatedAt: new Date(),
            },
          },
          { arrayFilters: [{ 'v.variantId': v.variantId }] },
        ));
        repriced.push({ designID: item.designID, variantId: v.variantId, ok: true, retail: v.retail });
      }
      const stillUnpriced = priced.variants.filter((x) => !x.ok);
      for (const v of stillUnpriced) repriced.push({ designID: item.designID, variantId: v.variantId, ok: false, reason: v.reason });
    }

    for (const item of pre.eligible) {
      // Publish state lives on the DESIGN (§3.2); the sync engine maps it onto the listing.
      await DesignsModel.updateById(item.designID, {
        listing: {
          published: true, visible: true, featured: false,
          publishedAt: new Date(), listedBy: releasedBy,
        },
      });
      const report = await syncDesignListing(item.designID);
      // The sync refuses to publish a doc that fails the storefront contract — surface that
      // instead of reporting a release that quietly left the listing dark.
      if (report.action === 'blocked' || report.publishBlocked) {
        failed.push({
          ...item,
          productId: report.productId ?? null,
          reasons: report.violations?.length ? report.violations : ['listing failed the storefront contract'],
        });
      } else {
        published.push({ ...item, productId: report.productId ?? null });
      }
    }

    const releasedAt = new Date();
    await DropsModel.updateById(dropId, {
      status: DROP_STATUS.RELEASED,
      releasedAt,
      ...(releasedBy ? { releasedBy } : {}),
    });

    // Make the drop itself visible to the shop (not just its products).
    const drop = await DropsModel.findById(dropId);
    shopProjection = await projectDropToShop({ drop, published, releasedAt });
  }

  return {
    ok: true,
    dryRun,
    dropId: pre.dropId,
    name: pre.name,
    published: dryRun ? pre.eligible : published,
    publishFailed: failed,
    blocked: pre.blocked,
    ...(repriced.length ? { repriced } : {}),
    ...(shopProjection ? { shopDropPage: shopProjection } : {}),
  };
}

/** Small helper so the pricing write above reads cleanly. */
async function dropDb() { return db.connect(); }

/**
 * Release every scheduled drop whose `releaseAt` has passed. This is the thing that makes a
 * SCHEDULED drop actually drop — without it a drop sits at "scheduled" forever.
 */
export async function releaseDueDrops({ now = new Date(), dryRun = false } = {}) {
  const dbi = await db.connect();
  const scheduled = await dbi.collection('drops')
    .find({ status: DROP_STATUS.SCHEDULED }, { projection: { _id: 0 } })
    .toArray();

  const due = scheduled.filter((drop) => {
    const at = parseReleaseAt(drop.releaseAt);
    return at && at <= now;
  });

  const results = [];
  for (const drop of due) {
    const result = await releaseDrop(drop.dropId, { dryRun, releasedBy: 'cron:release-drops' });
    results.push({ dropId: drop.dropId, name: drop.name, ...result });
  }
  return {
    scanned: scheduled.length,
    due: due.length,
    released: results.filter((r) => r.ok).length,
    refused: results.filter((r) => !r.ok),
    results,
  };
}
