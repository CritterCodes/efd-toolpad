import { normalizeArtisanType, ARTISAN_TYPE } from '@/lib/artisans';

/**
 * Design permissions — artisan self-service (owner's matrix, 2026-07-22):
 *   - jewelers, engravers, CAD designers → create/manage JEWELRY designs
 *   - gem cutters                        → create/manage GEMSTONE designs
 *   - admins/staff/dev                   → everything
 * Artisans manage ONLY their own designs (primaryArtisanId), and their design list is scoped to
 * their own. (Customs-assignment access + onsite-jeweler repairs are separate slices — repairs is
 * already modeled via isOnsiteRepairOps/staffCapabilities.)
 *
 * All pure session math: session.user carries { role, userID, artisanTypes[] } (raw Title Case
 * labels — normalize before comparing; see lib/artisans.js).
 */

const STAFF_ROLES = ['admin', 'dev', 'staff'];
const JEWELRY_TYPES = [ARTISAN_TYPE.JEWELER, ARTISAN_TYPE.ENGRAVER, ARTISAN_TYPE.CAD_DESIGNER, ARTISAN_TYPE.DESIGNER];
const GEM_TYPES = [ARTISAN_TYPE.GEM_CUTTER];

export const isStaff = (session) => STAFF_ROLES.includes(session?.user?.role);

/** Normalized artisan types from the session (kebab-case; raw labels vary in shape/casing). */
export function sessionArtisanTypes(session) {
  const raw = session?.user?.artisanTypes;
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeArtisanType).filter(Boolean);
}

/** Can this session author a design of this category? (gemstone → gem cutters; else jewelry crew) */
export function canCreateDesignCategory(session, category) {
  if (isStaff(session)) return true;
  if (session?.user?.role !== 'artisan') return false;
  const types = sessionArtisanTypes(session);
  const wanted = category === 'gemstone' ? GEM_TYPES : JEWELRY_TYPES;
  return types.some((t) => wanted.includes(t));
}

/** True when the artisan owns the design (primaryArtisanId matches their userID/email). */
export function ownsDesign(session, design) {
  const ids = [session?.user?.userID, session?.user?.email].filter(Boolean);
  return Boolean(design?.primaryArtisanId && ids.includes(design.primaryArtisanId));
}

/** Can this session edit/delete this specific design? Staff always; artisans only their own,
 *  and only in a category their type covers. */
export function canManageDesign(session, design) {
  if (isStaff(session)) return true;
  if (session?.user?.role !== 'artisan') return false;
  return ownsDesign(session, design) && canCreateDesignCategory(session, design?.category);
}

/** Mongo filter scoping a design list to what the session may see (staff = everything). */
export function designListFilter(session) {
  if (isStaff(session)) return {};
  return { primaryArtisanId: session?.user?.userID || session?.user?.email || '__none__' };
}
