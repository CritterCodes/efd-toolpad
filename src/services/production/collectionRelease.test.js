import { describe, it, expect } from 'vitest';
import { isDue, releasePlan } from '@/services/production/collectionRelease';
import { COLLECTION_STATUS } from '@/services/production/collectionsUnify';

const NOW = new Date('2026-07-02T12:00:00Z');

describe('isDue', () => {
  it('true only when scheduled AND releaseAt has passed', () => {
    expect(isDue({ status: 'scheduled', releaseAt: '2026-07-01T00:00:00Z' }, NOW)).toBe(true);
    expect(isDue({ status: 'scheduled', releaseAt: '2026-07-03T00:00:00Z' }, NOW)).toBe(false); // future
    expect(isDue({ status: 'draft', releaseAt: '2026-07-01T00:00:00Z' }, NOW)).toBe(false); // not scheduled
    expect(isDue({ status: 'scheduled' }, NOW)).toBe(false); // no releaseAt
    expect(isDue({ status: 'released', releaseAt: '2026-07-01T00:00:00Z' }, NOW)).toBe(false);
  });
});

describe('releasePlan', () => {
  it('extracts member productIds and a released collection patch', () => {
    const plan = releasePlan({ members: [{ productId: 'a', position: 0 }, { productId: 'b', position: 1 }] }, NOW);
    expect(plan.memberProductIds).toEqual(['a', 'b']);
    expect(plan.collectionUpdate.status).toBe(COLLECTION_STATUS.RELEASED);
    expect(plan.collectionUpdate.releasedAt).toEqual(NOW);
  });

  it('handles an empty / member-less collection', () => {
    expect(releasePlan({}, NOW).memberProductIds).toEqual([]);
    expect(releasePlan({ members: [{ position: 0 }] }, NOW).memberProductIds).toEqual([]); // no productId → filtered
  });
});
