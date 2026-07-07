import { describe, it, expect } from 'vitest';
import { isDue, releasePlan, unreadyMembers } from '@/services/production/collectionRelease';
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

describe('unreadyMembers (§8 release gate — relocated from members-add, #203)', () => {
  const ready = { productId: 'ok', title: 'Ring', pricing: { retailPrice: 100 }, availability: 'ready-to-ship', images: ['https://x/a.jpg'] };

  it('returns [] when every member passes contract §8', () => {
    expect(unreadyMembers([ready, { ...ready, productId: 'ok2' }])).toEqual([]);
  });

  it('flags members that fail §8 (and a missing product doc)', () => {
    const bad = { productId: 'bad', title: '', availability: 'whenever' }; // no title/price/media/availability
    const out = unreadyMembers([ready, bad, { productId: 'phantom' }]);
    expect(out.map((r) => r.productId).sort()).toEqual(['bad', 'phantom']);
    expect(out.every((r) => Array.isArray(r.errors) && r.errors.length > 0)).toBe(true);
  });

  it('tolerates empty input', () => {
    expect(unreadyMembers([])).toEqual([]);
    expect(unreadyMembers(undefined)).toEqual([]);
  });
});
