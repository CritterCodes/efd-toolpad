/**
 * The jewelry editor, mapped onto Design + Piece.
 *
 * Same move as `gemListingEditor`, and for the same reason: the editor used to read and write a
 * `products` document, which efd-shop no longer reads. A save looked like it worked and reached
 * no shopper.
 *
 * WHERE EACH FIELD LIVES:
 *
 *   DESIGN — the OFFERING. Name, story, what kind of thing it is, the photos, and the specs that
 *   are true of anything made from it: whether it can be sized and how far, whether a chain is
 *   included, the clasp, the casting/lead-time plan, the 3D files.
 *
 *   VARIANT — the metal options the design is offered in (the studio authors these).
 *
 *   PIECE — the AS-BUILT facts of the thing in the case: the metal it is actually in, its karat
 *   and finish, its finished weight, its ring size, its measurements, and its price. These are
 *   the fields casting orders and repair intake read, and on the consigned pieces they are still
 *   null — this editor is how they get filled.
 *
 * The response keeps the exact nested shape `useJewelryEditor` already consumes (top-level facts
 * plus a `jewelry` block plus `repairItem`), so no component changes.
 *
 * Pure: no DB. The route supplies the documents and applies the returned dotted-path updates.
 */
import { deriveRepairItemMetadata } from '@/lib/productRepairMetadata';

const str = (v) => (v == null ? '' : String(v));
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && String(v ?? '').trim() !== '' ? n : null;
};
const list = (v) => (Array.isArray(v) ? v : []);

/** The variant the editor edits — a one-off carries exactly one. */
export function editorVariant(design) {
  const variants = design?.variants || [];
  return variants.find((v) => v.variantId === design?.defaultVariantId && v.active)
    || variants.find((v) => v.active)
    || variants[0]
    || null;
}

/** The piece the editor edits. A sold piece is still editable; a scrapped one is the last resort. */
export function editorPiece(pieces = []) {
  return pieces.find((p) => p.status === 'available')
    || pieces.find((p) => !['scrapped', 'cancelled'].includes(p.status))
    || pieces[0]
    || null;
}

/**
 * The metals the form shows. The primary metal is canonical on the piece itself
 * (`metalType`/`karat`/`finish` — what casting orders and repair intake read); `piece.metals`
 * only carries the extras, so a two-tone piece round-trips without a second copy of its primary.
 */
export function metalsOf(piece) {
  if (!piece) return [];
  const extra = list(piece.metals);
  const primary = {
    type: piece.metalType || '',
    color: piece.finish || '',
    purity: piece.karat || '',
    weight: piece.weight ?? 0,
  };
  if (!primary.type && !primary.purity && !primary.color) return extra;
  return [primary, ...extra];
}

/** An 'unlimited' edition means it can still be made; a spent one-of-one is the piece in the case. */
export function isMadeToOrder(design) {
  return (design?.edition?.type || 'one_of_one') !== 'one_of_one';
}

/** Design + Piece → the nested shape `useJewelryEditor` already reads. */
export function toEditorShape({ design, piece = null }) {
  if (!design) return null;
  const a = design.attributes || {};
  const metals = metalsOf(piece);
  const mto = isMadeToOrder(design);
  const variant = editorVariant(design);

  const jewelry = {
    type: design.category || a.type || '',
    category: design.category || '',
    madeToOrder: mto,

    // Flat single-metal fields the older form controls still bind to.
    material: metals[0]?.type || '',
    metalColor: metals[0]?.color || '',
    purity: metals[0]?.purity || '',
    weight: metals[0]?.weight ?? '',
    size: piece?.ringSize || '',
    metals,

    gemstoneLinks: list(design.gemLinks),
    centerStones: list(a.centerStones),
    accentStones: list(a.accentStones),
    customMounting: a.customMounting === true,

    production: {
      castingRequired: design.production?.castingRequired === true,
      estimatedLeadTimeDays: design.production?.estimatedLeadTimeDays ?? null,
      notes: design.production?.notes || '',
    },

    ringSize: piece?.ringSize || '',
    canBeSized: a.canBeSized === true,
    sizingRangeUp: a.sizingRangeUp || '',
    sizingRangeDown: a.sizingRangeDown || '',
    chainIncluded: a.chainIncluded === true,
    chainMaterial: a.chainMaterial || '',
    chainLength: a.chainLength || '',
    chainStyle: a.chainStyle || '',
    length: piece?.length || a.length || '',
    claspType: a.claspType || '',
    dimensions: piece?.dimensions || '',

    objFile: design.files?.obj || null,
    stlFile: design.files?.stl || null,
    // The shop's viewer reads the design's glbUrl — the editor's upload is that same file.
    glbFile: design.viewer?.glbUrl || null,

    dynamicPricing: a.dynamicPricing || null,
  };

  const price = piece?.pricing?.retailPrice
    ?? variant?.pricing?.retailPrice
    ?? design.suggestedRetail
    ?? '';

  return {
    // `productId` stays the key existing editor routes and links already use.
    productId: design.listing?.handle || design.primaryProductId || design.productID || design.designID,
    designID: design.designID,
    pieceID: piece?.pieceID || null,
    productType: 'jewelry',
    // The piece's own state — a sold one-off must not be invoiced twice. Distinct from `status`,
    // which is only whether the listing is published.
    pieceStatus: piece?.status || null,
    createdAt: design.createdAt || null,
    updatedAt: design.updatedAt || null,

    title: design.name || '',
    description: design.description || '',
    notes: design.internalNotes || '',

    status: design.listing?.published ? 'active' : 'draft',
    availability: mto ? 'made-to-order' : 'ready-to-ship',
    listingType: mto ? 'made-to-order' : 'finished',
    classification: a.classification || 'signature',

    userId: design.primaryArtisanId || design.createdBy || '',
    vendor: design.vendor || '',
    images: design.media?.images || [],
    tags: list(design.tags),

    price,
    pricing: {
      retailPrice: piece?.pricing?.retailPrice ?? null,
      compareAtPrice: piece?.pricing?.compareAtPrice ?? null,
      costBasis: piece?.pricing?.costBasis ?? null,
    },

    jewelry,
    // Derived, never stored: repair intake reads this off the live metal facts.
    repairItem: deriveRepairItemMetadata({ jewelry }),
  };
}

/**
 * The editor's payload → dotted-path updates for the Design and the Piece.
 *
 * Dotted paths only: a whole-subdocument assignment would delete every key the form did not
 * send, which is the recurring data-loss shape in this codebase.
 *
 * @returns {{ designSet: object, pieceSet: object, warnings: string[] }}
 */
export function applyEditorPatch({ design, piece = null, data = {}, actor = null }) {
  const designSet = {};
  const pieceSet = {};
  const warnings = [];
  const has = (k) => Object.prototype.hasOwnProperty.call(data, k);

  // ── the offering ────────────────────────────────────────────────────────────
  if (has('title') && str(data.title).trim()) designSet.name = str(data.title).trim();
  if (has('description')) designSet.description = str(data.description);
  if (has('notes') || has('internalNotes')) designSet.internalNotes = str(data.notes ?? data.internalNotes);
  if (has('vendor') && str(data.vendor).trim()) designSet.vendor = str(data.vendor).trim();
  if (has('type') && str(data.type).trim()) designSet.category = str(data.type).trim();
  if (has('tags') && Array.isArray(data.tags)) designSet.tags = data.tags;
  if (has('images')) designSet['media.images'] = list(data.images);
  if (has('gemstoneLinks')) designSet.gemLinks = list(data.gemstoneLinks);

  for (const [key, path] of Object.entries({
    classification: 'attributes.classification',
    canBeSized: 'attributes.canBeSized',
    sizingRangeUp: 'attributes.sizingRangeUp',
    sizingRangeDown: 'attributes.sizingRangeDown',
    chainIncluded: 'attributes.chainIncluded',
    chainMaterial: 'attributes.chainMaterial',
    chainLength: 'attributes.chainLength',
    chainStyle: 'attributes.chainStyle',
    claspType: 'attributes.claspType',
    customMounting: 'attributes.customMounting',
    centerStones: 'attributes.centerStones',
    accentStones: 'attributes.accentStones',
    dynamicPricing: 'attributes.dynamicPricing',
  })) {
    if (has(key)) designSet[path] = data[key];
  }

  if (has('castingRequired')) designSet['production.castingRequired'] = data.castingRequired === true;
  if (has('estimatedLeadTimeDays')) designSet['production.estimatedLeadTimeDays'] = num(data.estimatedLeadTimeDays);
  if (has('productionNotes')) designSet['production.notes'] = str(data.productionNotes);

  if (has('objFile') && data.objFile !== undefined) designSet['files.obj'] = data.objFile || null;
  if (has('stlFile') && data.stlFile !== undefined) designSet['files.stl'] = data.stlFile || null;
  if (has('glbFile') && data.glbFile !== undefined) designSet['viewer.glbUrl'] = data.glbFile || null;

  // Made-to-order is the EDITION's question: can another one still be made? Only the type is
  // written here — allocated/committed/nextNumber are server-owned counters, and an editor that
  // rewrote them would re-open capacity on a one-of-one that has already been made and sold.
  const wantsMto = has('madeToOrder')
    ? data.madeToOrder === true
    : (has('availability') ? str(data.availability) === 'made-to-order' : undefined);
  if (wantsMto !== undefined && wantsMto !== isMadeToOrder(design)) {
    designSet['edition.type'] = wantsMto ? 'unlimited' : 'one_of_one';
  }

  // Publish state is the design's listing block — the flag the storefront reads.
  if (has('status')) {
    const live = ['active', 'published'].includes(str(data.status).toLowerCase());
    designSet['listing.published'] = live;
    designSet['listing.visible'] = live;
    if (live) {
      designSet['listing.handle'] = design.listing?.handle || design.primaryProductId || design.productID || design.designID;
      designSet['listing.publishedAt'] = design.listing?.publishedAt || new Date();
      if (actor) designSet['listing.listedBy'] = actor;
    }
  }

  // ── the physical piece ──────────────────────────────────────────────────────
  const asBuilt = ['metals', 'material', 'purity', 'metalColor', 'weight', 'ringSize', 'size', 'dimensions', 'length', 'price', 'compareAtPrice', 'costBasis'];
  if (!piece) {
    if (asBuilt.some(has)) {
      warnings.push('This design has no piece yet, so the metal, size and price could not be saved — make a piece for it first.');
    }
    return { designSet, pieceSet, warnings };
  }

  // The primary metal is canonical on the piece; any others ride along in `metals`. Casting
  // orders read metalType/karat off the piece, so leaving them null is a wrong-metal hazard.
  if (has('metals') || has('material') || has('purity') || has('metalColor') || has('weight')) {
    const incoming = list(data.metals);
    const primary = incoming[0] || {
      type: data.material, color: data.metalColor, purity: data.purity, weight: data.weight,
    };
    pieceSet.metalType = str(primary?.type) || null;
    pieceSet.karat = str(primary?.purity) || null;
    pieceSet.finish = str(primary?.color) || null;
    pieceSet.weight = num(primary?.weight);
    pieceSet.metals = incoming.slice(1);
  }

  if (has('ringSize') || has('size')) pieceSet.ringSize = str(data.ringSize ?? data.size) || null;
  if (has('dimensions')) pieceSet.dimensions = data.dimensions || null;
  if (has('length')) pieceSet.length = data.length || null;

  // A one-off's price lives on the piece. The daily repricer authors VARIANT prices, so a price
  // written there would be overwritten that night; the piece's is the one that sticks.
  if (has('price')) pieceSet['pricing.retailPrice'] = num(data.price);
  if (has('compareAtPrice')) pieceSet['pricing.compareAtPrice'] = num(data.compareAtPrice);
  if (has('costBasis')) pieceSet['pricing.costBasis'] = num(data.costBasis);

  return { designSet, pieceSet, warnings };
}
