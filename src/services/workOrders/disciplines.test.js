import { describe, it, expect } from 'vitest';
import { DISCIPLINE, disciplinesForArtisanTypes, canClaimDiscipline, isValidDiscipline } from './disciplines';

/**
 * Artisan types are typed by hand on the application form, so the mapping has to survive how they are
 * ACTUALLY stored. Production holds "Gem Cutter" as a bare string, ["Jeweler","CAD Designer"] as an
 * array, and one artisan saved as "Engraver" — which the old exact-match map ('Hand Engraver') missed
 * entirely, dropping him into the bench_jewelry fallback: the wrong lane, and engraving work he could
 * never claim.
 */
describe('disciplinesForArtisanTypes', () => {
  it('maps the types production actually holds', () => {
    expect(disciplinesForArtisanTypes(['Gem Cutter'])).toEqual([DISCIPLINE.GEM_CUTTING]);
    expect(disciplinesForArtisanTypes(['Jeweler', 'Gem Cutter', 'CAD Designer']))
      .toEqual([DISCIPLINE.BENCH_JEWELRY, DISCIPLINE.GEM_CUTTING, DISCIPLINE.CAD]);
  });

  it('accepts "Engraver" and "Hand Engraver" as the same lane — both exist in the roster', () => {
    expect(disciplinesForArtisanTypes(['Engraver'])).toEqual([DISCIPLINE.ENGRAVING]);
    expect(disciplinesForArtisanTypes(['Hand Engraver'])).toEqual([DISCIPLINE.ENGRAVING]);
  });

  it('is indifferent to case, spacing and underscores', () => {
    for (const t of ['gem cutter', 'GEM CUTTER', 'gem_cutter', ' Gem  Cutter ', 'gem-cutter']) {
      expect(disciplinesForArtisanTypes([t]), t).toEqual([DISCIPLINE.GEM_CUTTING]);
    }
  });

  it('de-duplicates and ignores types that are not bench lanes', () => {
    expect(disciplinesForArtisanTypes(['Jeweler', 'jeweler'])).toEqual([DISCIPLINE.BENCH_JEWELRY]);
    // "Designer" authors designs; it is not a lane anyone claims work orders from.
    expect(disciplinesForArtisanTypes(['Designer'])).toEqual([]);
    expect(disciplinesForArtisanTypes([])).toEqual([]);
    expect(disciplinesForArtisanTypes(null)).toEqual([]);
    expect(disciplinesForArtisanTypes([null, '', 'Nonsense'])).toEqual([]);
  });
});

describe('canClaimDiscipline', () => {
  it('lets a gem cutter claim gem cutting and nothing else', () => {
    expect(canClaimDiscipline(['Gem Cutter'], DISCIPLINE.GEM_CUTTING)).toBe(true);
    expect(canClaimDiscipline(['Gem Cutter'], DISCIPLINE.BENCH_JEWELRY)).toBe(false);
    expect(canClaimDiscipline(['Gem Cutter'], DISCIPLINE.CAD)).toBe(false);
  });

  it('refuses when the discipline is missing or unknown', () => {
    expect(canClaimDiscipline(['Jeweler'], null)).toBe(false);
    expect(canClaimDiscipline(['Jeweler'], 'welding')).toBe(false);
    expect(canClaimDiscipline([], DISCIPLINE.BENCH_JEWELRY)).toBe(false);
  });

  it('knows its own lanes', () => {
    expect(isValidDiscipline(DISCIPLINE.GEM_CUTTING)).toBe(true);
    expect(isValidDiscipline('welding')).toBe(false);
  });
});
