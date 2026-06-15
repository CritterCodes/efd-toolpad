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

// artisanType (Constants.ARTISAN_TYPES) -> discipline it can claim.
const ARTISAN_TYPE_TO_DISCIPLINE = {
  'Jeweler': DISCIPLINE.BENCH_JEWELRY,
  'CAD Designer': DISCIPLINE.CAD,
  'Hand Engraver': DISCIPLINE.ENGRAVING,
  'Gem Cutter': DISCIPLINE.GEM_CUTTING,
};

/** Disciplines a user may self-claim, derived from their artisanTypes. */
export function disciplinesForArtisanTypes(artisanTypes = []) {
  const set = new Set();
  for (const type of artisanTypes || []) {
    const discipline = ARTISAN_TYPE_TO_DISCIPLINE[type];
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
