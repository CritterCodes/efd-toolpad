import { getUserArtisanTypes, canManageJewelry } from '@/lib/productPermissions';

/**
 * Who may change a jewelry listing (its Design + Piece), including the files and images uploaded to it.
 *
 * One rule for the editor's PUT/DELETE and for every upload route it calls. The upload routes used to check
 * only that the caller was signed in, so any account — a customer, a store — could replace a design's GLB
 * (what efd-shop's viewer shows) or push images onto any listing (goal step 4, 2026-10-01).
 */
export const LISTING_STAFF_ROLES = new Set(['admin', 'superadmin', 'dev', 'staff']);

/** Pure: staff, or the artisan who owns the design. */
export function canAccessListing(session, design) {
  if (!session?.user || !design) return false;
  if (LISTING_STAFF_ROLES.has(session.user.role)) return true;
  const ids = [session.user.userID, session.user.email].filter(Boolean);
  return ids.includes(design.primaryArtisanId) || ids.includes(design.createdBy);
}

/** Non-staff editors must actually be jewelers. Returns an error message, or null when allowed. */
export async function listingEditorRefusal(db, session) {
  if (LISTING_STAFF_ROLES.has(session?.user?.role)) return null;
  const userProfile = await db.collection('users').findOne({
    $or: [
      ...(session.user.userID ? [{ userID: session.user.userID }] : []),
      ...(session.user.email ? [{ email: session.user.email }] : []),
    ],
  });
  if (!canManageJewelry(session.user.role, getUserArtisanTypes(userProfile))) {
    return 'Only jewelers and admins can edit jewelry listings';
  }
  return null;
}
