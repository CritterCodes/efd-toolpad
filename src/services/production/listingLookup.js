/**
 * Resolving a listing id to its Design (+ the Piece being edited).
 *
 * Listings used to be `products` documents keyed by `productId`; admin links, sales-invoice
 * lines and bookmarks all still carry those ids. So an id may be a listing handle, a legacy
 * product id (stored on the design as `primaryProductId` or `productID`) or a designID, and
 * every one of them has to keep resolving.
 *
 * It lives here rather than in a route because several routes need the same rule — the editor,
 * its file uploads — and a second copy of a lookup is how two surfaces quietly stop agreeing.
 */
import { editorPiece as gemEditorPiece } from '@/services/production/gemListingEditor';
import { editorPiece as jewelryEditorPiece } from '@/services/production/jewelryListingEditor';

const idMatch = (id) => ({
  $or: [
    { 'listing.handle': id },
    { primaryProductId: id },
    { productID: id },
    { designID: id },
  ],
});

/**
 * A catalog jewelry listing: any non-gemstone design an artisan owns. Custom-order designs carry
 * a designerUserID and no primaryArtisanId — they are work in progress, not listings.
 */
export const CATALOG_JEWELRY = {
  category: { $ne: 'gemstone' },
  primaryArtisanId: { $exists: true, $nin: [null, ''] },
};

export const CATALOG_GEMSTONE = { category: 'gemstone' };

async function load(db, id, filter, pickPiece) {
  const design = await db.collection('designs').findOne({ ...filter, ...idMatch(id) });
  if (!design) return { design: null, piece: null, pieces: [] };
  const pieces = await db.collection('pieces').find({ designID: design.designID }).toArray();
  return { design, piece: pickPiece(pieces), pieces };
}

export function loadJewelryListing(db, id) {
  return load(db, id, CATALOG_JEWELRY, jewelryEditorPiece);
}

export function loadGemListing(db, id) {
  return load(db, id, CATALOG_GEMSTONE, gemEditorPiece);
}
