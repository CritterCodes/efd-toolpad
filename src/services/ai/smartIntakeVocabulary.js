/**
 * The model's free text in the form's vocabulary: karat, gold colour, metal. Shape only — no rulings. Split out of
 * smartIntakeRules.js (which re-exports these) for the line limit.
 */
const str = (v) => String(v ?? '').trim();

/* ------------------------------------------------------- metal vocabulary */

/**
 * Karat/purity → the exact vocabulary the form's Select uses ('14k', '925', '950'…). The model answers in free text
 * ("14K", "14 kt"); anything that doesn't normalize cleanly becomes '' rather than a value the Select can't render —
 * a silently blank field is how a 14k price gets charged on an 18k ring.
 */
export const normalizeKaratValue = (value) => {
  const raw = str(value).toLowerCase().replace(/\s+/g, '');
  if (!raw) return '';
  // Only the purities the form's Select has. "585" and "750" are karats in another notation; passing them through
  // gave the form a value it cannot show (review, 2026-11-09).
  if (/^\d{3}$/.test(raw)) return ['925', '950', '999', '900'].includes(raw) ? raw : '';
  const m = raw.match(/^(\d{1,2})k?t?$/);          // 14, 14k, 14kt
  // A karat is 8 to 24: "7" is a ring size that strayed into the field, not 7k.
  return m && Number(m[1]) >= 8 && Number(m[1]) <= 24 ? `${m[1]}k` : '';
};

/**
 * Silver and platinum carry their purity in the NAME, so nobody says it out loud. "Sterling silver ring" states no
 * karat, an empty karat cannot be priced, and every silver job said "Choose a metal to price this" with the metal
 * already filled in (owner, 2026-10-12). Silver means 925 and platinum means 950 — ONLY when the field came back
 * empty. A stated 999 or 900 is left exactly as stated.
 */
const DEFAULT_PURITY = Object.freeze({ silver: '925', platinum: '950' });
export const applyDefaultPurity = (metalType, karat) => (karat ? karat : (DEFAULT_PURITY[metalType] || karat));

/**
 * The model's colour in the form's vocabulary. It answers "White Gold" or "wg" as readily as "white"; reading those as
 * unknown and then defaulting to yellow turned a white gold ring yellow (review, 2026-11-09). The yellow default is
 * for a BLANK answer only; a colour said in words we don't know stays blank, where a person sees it.
 */
export const normalizeGoldColor = (value) => {
  const raw = str(value).toLowerCase();
  // The FIRST colour named: "yellow gold with white gold head" is a yellow ring (review, 2026-11-09).
  const found = [['white', /\bwhite\b|^wg$/], ['rose', /\brose\b|\bpink\b|^rg$/], ['yellow', /\byellow\b|^yg$/]]
    .map(([colour, re]) => [colour, raw.search(re)]).filter(([, at]) => at >= 0).sort((a, b) => a[1] - b[1]);
  return found.length ? found[0][0] : '';
};

/** The model's metal in the form's vocabulary. It answers "white gold" or "sterling" as readily as "gold" or "silver". */
export const normalizeMetalType = (value) => {
  const raw = str(value).toLowerCase();
  // "gold plated" is plated, not platinum.
  if (/\bplat(?:inum)?\b/.test(raw) || raw === 'pt') return 'platinum';
  if (/\bgold\b|^[ywr]g$/.test(raw)) return 'gold';
  if (/\bsilver\b|\bsterling\b|^ss$/.test(raw)) return 'silver';
  if (/\bcostume\b/.test(raw)) return 'costume';
  return '';
};
