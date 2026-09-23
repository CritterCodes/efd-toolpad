/**
 * Work Order disciplines (skill "lanes") and their mapping to artisan types.
 * A user may self-claim a work order only if its discipline is one their
 * artisanTypes grant. See docs/manufacturing (D9, D10).
 */

export const DISCIPLINE = {
  BENCH_JEWELRY: 'bench_jewelry', // repairs, production finishing, stone setting, resizes
  CAD: 'cad',                     // CAD / design work
  ENGRAVING: 'engraving',         // hand engraving
  GEM_CUTTING: 'gem_cutting',     // lapidary
};

export const ALL_DISCIPLINES = Object.values(DISCIPLINE);

/**
 * artisanType -> the discipline it may claim, keyed on the NORMALIZED type
 * (lib/artisans.normalizeArtisanType: lowercased, spaces/underscores to hyphens).
 *
 * This used to key on exact display strings ('Hand Engraver', 'Gem Cutter'), which quietly failed for
 * anything stored differently — production has one artisan saved as "Engraver", who therefore resolved
 * to NO discipline and fell through to the bench_jewelry fallback: the wrong lane, and no way to claim
 * engraving work. Types are entered by hand on the application form, so matching has to tolerate case
 * and spacing rather than assume one spelling.
 */
const ARTISAN_TYPE_TO_DISCIPLINE = {
  'jeweler': DISCIPLINE.BENCH_JEWELRY,
  'bench-jeweler': DISCIPLINE.BENCH_JEWELRY,
  'cad-designer': DISCIPLINE.CAD,
  'cad': DISCIPLINE.CAD,
  'engraver': DISCIPLINE.ENGRAVING,
  'hand-engraver': DISCIPLINE.ENGRAVING,
  'gem-cutter': DISCIPLINE.GEM_CUTTING,
  'gemcutter': DISCIPLINE.GEM_CUTTING,
  'lapidary': DISCIPLINE.GEM_CUTTING,
};

const normalizeType = (t) => String(t || '').trim().toLowerCase().replace(/[\s_]+/g, '-');

/** Disciplines a user may self-claim, derived from their artisanTypes. */
export function disciplinesForArtisanTypes(artisanTypes = []) {
  const set = new Set();
  for (const type of artisanTypes || []) {
    const discipline = ARTISAN_TYPE_TO_DISCIPLINE[normalizeType(type)];
    if (discipline) set.add(discipline);
  }
  return [...set];
}

/** Whether a user (by artisanTypes) may self-claim a given discipline. */
export function canClaimDiscipline(artisanTypes = [], discipline) {
  if (!discipline) return false;
  return disciplinesForArtisanTypes(artisanTypes).includes(discipline);
}

export function isValidDiscipline(discipline) {
  return ALL_DISCIPLINES.includes(discipline);
}
