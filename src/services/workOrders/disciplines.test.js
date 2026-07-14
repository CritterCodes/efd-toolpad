import { describe, expect, it } from 'vitest';
import { canClaimDiscipline, DISCIPLINE, disciplinesForArtisanTypes } from './disciplines';

describe('casting discipline', () => {
  it('lets a caster claim casting work without granting another lane', () => {
    expect(disciplinesForArtisanTypes(['Caster'])).toEqual([DISCIPLINE.CASTING]);
    expect(canClaimDiscipline(['Caster'], DISCIPLINE.CASTING)).toBe(true);
    expect(canClaimDiscipline(['Caster'], DISCIPLINE.BENCH_JEWELRY)).toBe(false);
  });
});
