/**
 * The gemstone editor, mapped onto Design + Piece.
 *
 * The editor used to read and write a `products` document. efd-shop stopped reading that
 * collection, so those writes became invisible to the storefront while still displaying back
 * correctly in admin — an edit that looked saved and reached nobody. This module is the
 * translation layer that puts each field where the shop actually reads it.
 *
 * WHERE EACH FIELD LIVES (the split the data model already specifies):
 *
 *   DESIGN + its variant — the OFFERING. What is being sold, in the abstract: the name, the
 *   story, the cut (the cut IS the gem design), the species, natural vs lab. True of every
 *   stone this design could ever produce.
 *
 *   PIECE — the AS-BUILT facts of the physical stone in the drawer: its carat, its
 *   measurements, its colour and clarity, where it came from, its certificate, and its price.
 *   Two stones cut to the same design differ here, which is exactly why these cannot live on
 *   the design.
 *
 *   Acquisition cost and supplier stay on the piece too; the storefront's resolver strips that
 *   block, so it never reaches a shopper.
 *
 * Pure: no DB. The route supplies the documents and applies the returned dotted-path updates.
 */

const str = (v) => (v == null ? '' : String(v));
const arr = (v) => (Array.isArray(v) ? v : (str(v).trim() ? str(v).split(',').map((s) => s.trim()).filter(Boolean) : []));
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n !== 0 ? n : null;
};
/** Join an array back to the comma text the editor's single-line fields use. */
const text = (v) => (Array.isArray(v) ? v.join(', ') : str(v));

/** The active variant the editor edits (a gem design carries one species offering per variant). */
export function editorVariant(design) {
  const variants = design?.variants || [];
  return variants.find((v) => v.variantId === design?.defaultVariantId && v.active)
    || variants.find((v) => v.active)
    || variants[0]
    || null;
}

/** The piece the editor edits — the physical stone. Sold/scrapped ones are still editable. */
export function editorPiece(pieces = []) {
  return pieces.find((p) => p.status === 'available')
    || pieces.find((p) => !['scrapped', 'cancelled'].includes(p.status))
    || pieces[0]
    || null;
}

/**
 * Design + Piece → the flat shape the editor form already consumes, so the UI needs no
 * rewrite (the same trick that made the storefront migration invisible to its components).
 */
export function toEditorShape({ design, piece = null }) {
  if (!design) return null;
  const variant = editorVariant(design);
  const g = piece?.gemstone || {};
  const vg = variant?.gemstone || {};

  return {
    // identity — `productId` kept as the key the editor routes/links already use
    productId: design.listing?.handle || design.primaryProductId || design.designID,
    designID: design.designID,
    pieceID: piece?.pieceID || null,
    productType: 'gemstone',
    // The stone's own state — a sold one must not be offered again. Distinct from `status`,
    // which is only whether the listing is published.
    pieceStatus: piece?.status || null,
    createdAt: design.createdAt || null,
    updatedAt: design.updatedAt || null,

    title: design.name || '',
    description: design.description || '',
    internalNotes: design.internalNotes || '',
    vendor: design.vendor || '',

    // offering (design + variant)
    species: vg.species || g.species || '',
    subspecies: vg.subspecies || g.subspecies || '',
    naturalSynthetic: vg.naturalSynthetic || g.naturalSynthetic || 'natural',
    cut: text(design.gemstone?.cut),
    cutStyle: text(design.gemstone?.cutStyle),

    // as-built (piece)
    carat: g.carat ?? '',
    dimensions: text(g.dimensions && typeof g.dimensions === 'object'
      ? [g.dimensions.length, g.dimensions.width, g.dimensions.height].filter(Boolean).join(' × ')
      : g.dimensions),
    color: text(g.color),
    clarity: g.clarity || '',
    treatment: text(g.treatment),
    locale: g.locale || '',
    certification: g.certification || '',

    pricing: {
      retailPrice: piece?.pricing?.retailPrice ?? null,
      compareAtPrice: piece?.pricing?.compareAtPrice ?? null,
      costBasis: g.acquisitionPrice ?? null,
    },
    supplier: g.supplier || '',
    acquisitionPrice: g.acquisitionPrice ?? '',

    status: design.listing?.published ? 'active' : 'draft',
    images: design.media?.images || [],
  };
}

/**
 * The editor's flat payload → dotted-path updates for the Design and the Piece.
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
  const variant = editorVariant(design);

  // ── the offering ────────────────────────────────────────────────────────────
  if (has('title') && str(data.title).trim()) designSet.name = str(data.title).trim();
  if (has('description')) designSet.description = str(data.description);
  if (has('internalNotes') || has('notes')) designSet.internalNotes = str(data.internalNotes ?? data.notes);
  if (has('vendor') && str(data.vendor).trim()) designSet.vendor = str(data.vendor).trim();
  if (has('cut')) designSet['gemstone.cut'] = arr(data.cut);
  if (has('cutStyle')) designSet['gemstone.cutStyle'] = arr(data.cutStyle);

  // Species and natural/lab describe what the design OFFERS, so they belong on its variant.
  if (variant) {
    const vPath = `variants.$[v].gemstone`;
    if (has('species') && str(data.species).trim()) designSet[`${vPath}.species`] = str(data.species).trim();
    if (has('subspecies')) designSet[`${vPath}.subspecies`] = str(data.subspecies);
    if (has('naturalSynthetic') && str(data.naturalSynthetic)) designSet[`${vPath}.naturalSynthetic`] = str(data.naturalSynthetic);
  } else if (has('species')) {
    warnings.push('This design has no variant, so the species could not be saved — add a variant first.');
  }

  // Publish state is the design's listing block; the storefront reads it directly.
  if (has('status')) {
    const live = ['active', 'published'].includes(str(data.status).toLowerCase());
    designSet['listing.published'] = live;
    designSet['listing.visible'] = live;
    if (live) {
      designSet['listing.handle'] = design.listing?.handle || design.primaryProductId || design.designID;
      designSet['listing.publishedAt'] = design.listing?.publishedAt || new Date();
      if (actor) designSet['listing.listedBy'] = actor;
    }
  }

  // ── the physical stone ──────────────────────────────────────────────────────
  if (!piece) {
    if (['carat', 'dimensions', 'clarity', 'treatment', 'color', 'certification', 'price', 'retailPrice'].some(has)) {
      warnings.push('This design has no piece, so the stone’s measurements and price could not be saved.');
    }
    return { designSet, pieceSet, warnings };
  }

  if (has('carat')) pieceSet['gemstone.carat'] = num(data.carat);
  if (has('dimensions')) pieceSet['gemstone.dimensions'] = data.dimensions;
  if (has('color')) pieceSet['gemstone.color'] = arr(data.color);
  if (has('clarity')) pieceSet['gemstone.clarity'] = str(data.clarity);
  if (has('treatment')) pieceSet['gemstone.treatment'] = arr(data.treatment);
  if (has('locale')) pieceSet['gemstone.locale'] = str(data.locale);
  if (has('certification')) pieceSet['gemstone.certification'] = data.certification;
  // Admin-only provenance. The storefront's resolver strips this block.
  if (has('supplier')) pieceSet['gemstone.supplier'] = str(data.supplier);
  if (has('acquisitionPrice')) pieceSet['gemstone.acquisitionPrice'] = num(data.acquisitionPrice);
  if (has('acquisitionDate')) pieceSet['gemstone.acquisitionDate'] = data.acquisitionDate || null;

  // A one-off stone's price lives on the piece — that is what the shop's ready-to-ship offer
  // charges. There is no second copy to keep in step.
  const price = has('retailPrice') ? data.retailPrice : (has('price') ? data.price : undefined);
  if (price !== undefined) pieceSet['pricing.retailPrice'] = num(price);
  if (has('compareAtPrice')) pieceSet['pricing.compareAtPrice'] = num(data.compareAtPrice);

  // The species is also an as-built fact of the stone in the drawer, and the shop merges the
  // piece's spec over the design's — keep them from disagreeing.
  if (has('species') && str(data.species).trim()) pieceSet['gemstone.species'] = str(data.species).trim();
  if (has('naturalSynthetic') && str(data.naturalSynthetic)) pieceSet['gemstone.naturalSynthetic'] = str(data.naturalSynthetic);

  return { designSet, pieceSet, warnings };
}
