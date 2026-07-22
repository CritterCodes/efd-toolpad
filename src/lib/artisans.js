/**
 * Artisan helpers — one place to fetch + type-filter artisans.
 *
 * Users carry `artisanApplication.artisanType`, which in real data is an ARRAY or a STRING of
 * Title Case labels ("Gem Cutter", "Jeweler", "CAD Designer", "Engraver"). Everything here
 * normalizes to kebab-case ('gem-cutter') so comparisons are shape/casing-proof.
 *
 * Type filtering routes work to the right hands: gem-cutters for gemstone designs, jewelers/
 * designers for jewelry, in-house repair jewelers for repairs, CAD designers for CAD work.
 */

export const ARTISAN_TYPE = Object.freeze({
  JEWELER: 'jeweler',
  GEM_CUTTER: 'gem-cutter',
  CAD_DESIGNER: 'cad-designer',
  ENGRAVER: 'engraver',
  DESIGNER: 'designer',
});

export const normalizeArtisanType = (t) => String(t || '').trim().toLowerCase().replace(/[\s_]+/g, '-');

/** Normalized artisan types on a user object (handles array, comma-string, or single string). */
export function userArtisanTypes(user) {
  const raw = user?.artisanApplication?.artisanType ?? user?.artisanType;
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : String(raw).split(',');
  return arr.map(normalizeArtisanType).filter(Boolean);
}

/** True when the user has ANY of the wanted types (empty wanted = no filter). */
export function hasArtisanType(user, wanted = []) {
  if (!wanted.length) return true;
  const have = userArtisanTypes(user);
  const want = wanted.map(normalizeArtisanType);
  return have.some((t) => want.includes(t));
}

/**
 * Fetch artisans (client-side), unwrapping the /api/users `{success,data}` envelope, optionally
 * filtered to given types. NOTE: the envelope is why naive `Array.isArray(d)` checks come back
 * empty — always consume through here.
 */
export async function fetchArtisans({ types = [] } = {}) {
  const r = await fetch('/api/users?role=artisan');
  const d = await r.json().catch(() => ({}));
  const arr = Array.isArray(d) ? d : (d.data || d.users || []);
  return types.length ? arr.filter((u) => hasArtisanType(u, types)) : arr;
}
