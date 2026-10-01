import { describe, it, expect } from 'vitest';
import { buildQuery } from './queries';

/** EFD-DEFECTS P25: the task list's search and metal filter used to overwrite each other. */
describe('task list query', () => {
  it('keeps the search AND the metal filter', () => {
    const q = buildQuery({ search: 'size', metalType: 'platinum' });
    expect(q.$and).toHaveLength(2);
    expect(JSON.stringify(q.$and[0])).toContain('size');
    expect(JSON.stringify(q.$and[1])).toContain('platinum');
  });

  it('"offered for a metal" = unrestricted tasks or tasks restricted to it — never a stored price', () => {
    const q = buildQuery({ metalType: 'gold' });
    expect(JSON.stringify(q)).not.toContain('pricing');
    expect(q.$and[0].$or).toEqual(expect.arrayContaining([{ metals: { $exists: false } }, { metals: { $size: 0 } }]));
  });

  it('escapes the search text', () => {
    const q = buildQuery({ search: 'a.b(' });
    expect(q.$and[0].$or[0].title.$regex).toBe(String.raw`a\.b\(`);
  });

  it('ignores price filters — no prices are stored', () => {
    expect(buildQuery({ priceMin: 10 })).toEqual({});
  });
});
