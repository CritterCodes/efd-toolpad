import { describe, it, expect } from 'vitest';
import { buildQuery } from '@/app/api/tasks/queries';

/**
 * WHERE A TASK IS OFFERED.
 *
 * `contexts` lists the surfaces a task appears on: 'repair' (repair intake) and/or 'custom' (the custom
 * quote builder). Stone setting belongs on both — it is charged the same way either side. Some tasks
 * are custom-only, and until now that could not be said at all: the repair picker did not filter by
 * context, so anything tagged 'custom' showed up in repairs too.
 *
 * The asymmetry is deliberate. 'custom' is strict opt-in so the quote builder is not flooded with
 * retipping and sizing. 'repair' also matches UNTAGGED tasks, because all 27 tasks in the catalog
 * predate the field and are repair tasks — excluding them would empty the busiest screen in the shop.
 */
describe('buildQuery — task contexts', () => {
  const orOf = (q) => q.$and?.[0]?.$or || null;

  it('custom is strict opt-in: only tasks that say so', () => {
    expect(buildQuery({ context: 'custom' }).contexts).toBe('custom');
  });

  it('repair matches tagged AND untagged tasks', () => {
    const or = orOf(buildQuery({ context: 'repair' }));
    expect(or).toEqual([
      { contexts: 'repair' },
      { contexts: { $in: [null, []] } },
      { contexts: { $exists: false } },
    ]);
  });

  it('repair does NOT collapse to an equality match, which would hide every legacy task', () => {
    // The whole catalog is untagged today; `contexts: 'repair'` alone would return nothing.
    expect(buildQuery({ context: 'repair' }).contexts).toBeUndefined();
  });

  it('does not clobber the $or that search builds', () => {
    // search writes a top-level $or; the context filter uses $and so both survive.
    const q = buildQuery({ context: 'repair', search: 'size' });
    expect(q.$or).toHaveLength(4);                       // title/description/sku/process
    expect(orOf(q)).toHaveLength(3);                     // the context alternatives
  });

  it('leaves the query alone when no context is asked for', () => {
    const q = buildQuery({});
    expect(q.contexts).toBeUndefined();
    expect(q.$and).toBeUndefined();
  });

  it('still combines with the other filters', () => {
    const q = buildQuery({ context: 'custom', category: 'setting' });
    expect(q).toMatchObject({ contexts: 'custom', category: 'setting' });
  });
});

/**
 * The three shapes an operator can express, checked against what each surface asks for.
 * A task document is matched by hand here — buildQuery returns a filter, not results.
 */
describe('the three tagging shapes', () => {
  const matchesRepair = (contexts) => {
    const or = buildQuery({ context: 'repair' }).$and[0].$or;
    return or.some((clause) => {
      if (clause.contexts === 'repair') return Array.isArray(contexts) && contexts.includes('repair');
      if (clause.contexts?.$in) return contexts == null || (Array.isArray(contexts) && contexts.length === 0);
      if (clause.contexts?.$exists === false) return contexts === undefined;
      return false;
    });
  };
  const matchesCustom = (contexts) => Array.isArray(contexts) && contexts.includes('custom');

  it('untagged (every task today) = repair only', () => {
    expect(matchesRepair(undefined)).toBe(true);
    expect(matchesCustom(undefined)).toBe(false);
  });

  it("['repair','custom'] = both — the stone-setting case", () => {
    expect(matchesRepair(['repair', 'custom'])).toBe(true);
    expect(matchesCustom(['repair', 'custom'])).toBe(true);
  });

  it("['custom'] = CUSTOM ONLY — the shape that was impossible before", () => {
    expect(matchesRepair(['custom'])).toBe(false);
    expect(matchesCustom(['custom'])).toBe(true);
  });

  it("['repair'] = repair only, said explicitly", () => {
    expect(matchesRepair(['repair'])).toBe(true);
    expect(matchesCustom(['repair'])).toBe(false);
  });
});
