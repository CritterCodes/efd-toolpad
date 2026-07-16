import { beforeEach, describe, it, expect, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  updateById: vi.fn(),
  dbConnect: vi.fn(),
  loadCapability: vi.fn(),
  checkCapability: vi.fn(),
}));

vi.mock('@/app/api/collections/model', () => ({
  default: { findById: mocks.findById, updateById: mocks.updateById },
}));

vi.mock('@/lib/database', () => ({ db: { connect: mocks.dbConnect } }));

vi.mock('@/lib/mtoCapabilityGate', async (importOriginal) => {
  const real = await importOriginal();
  return {
    ...real,
    loadMtoCapabilityRecord: mocks.loadCapability,
    checkMtoCapabilityRecord: mocks.checkCapability,
  };
});

import { isDue, releasePlan, releaseCollection } from '@/services/production/collectionRelease';
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

// --- releaseCollection MTO capability gate (real release call site) ---

function makeDb({ products = [], designs = [], capabilityRecord = null } = {}) {
  const updateMany = vi.fn().mockResolvedValue({ modifiedCount: products.length });
  const db = {
    collection: vi.fn((name) => {
      if (name === 'products') {
        return {
          find: vi.fn(() => ({ toArray: async () => products })),
          updateMany,
        };
      }
      if (name === 'designs') {
        return { find: vi.fn(() => ({ toArray: async () => designs })) };
      }
      if (name === 'platformCapabilities') {
        return { findOne: async () => capabilityRecord };
      }
      return {};
    }),
    _updateMany: updateMany,
  };
  return db;
}

const scheduledCollection = {
  _id: 'col-1',
  status: COLLECTION_STATUS.SCHEDULED,
  releaseAt: NOW,
  members: [{ productId: 'jwl_mto_1' }, { productId: 'jwl_rts_1' }],
};

const mtoProductDoc = {
  productId: 'jwl_mto_1',
  designId: 'design-ring-001',
  variants: [{ variantId: 'v1', active: true, offers: { madeToOrder: { enabled: true } } }],
};

const rtsProductDoc = {
  productId: 'jwl_rts_1',
  designId: 'design-ring-002',
  variants: [{ variantId: 'v2', active: true, offers: { readyToShip: { quantity: 1, pieceIDs: ['p1'] } } }],
};

const cadCastDesign = { designID: 'design-ring-001', productionMethod: 'cad_cast' };
const handmadeDesign = { designID: 'design-handmade-001', productionMethod: 'handmade' };

const ACTIVE_CAPABILITY = { key: 'mtoCheckoutCapacity', version: 1, active: true, updatedAt: new Date() };

describe('releaseCollection — MTO capability gate (real release call site)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateById.mockResolvedValue({ ...scheduledCollection, status: COLLECTION_STATUS.RELEASED });
    mocks.checkCapability.mockReturnValue({ allowed: true });
  });

  it('releases a collection with no MTO products without checking the capability', async () => {
    mocks.findById.mockResolvedValue(scheduledCollection);
    // Only RTS product in the MTO product query result
    const db = makeDb({ products: [] }); // no products match the MTO query
    mocks.dbConnect.mockResolvedValue(db);

    await releaseCollection('col-1', { now: NOW });

    expect(mocks.loadCapability).not.toHaveBeenCalled();
    expect(db._updateMany).toHaveBeenCalledOnce();
  });

  it('releases a collection containing revised MTO products when the capability is active', async () => {
    mocks.findById.mockResolvedValue(scheduledCollection);
    const db = makeDb({
      products: [mtoProductDoc],
      designs: [cadCastDesign],
    });
    mocks.dbConnect.mockResolvedValue(db);
    mocks.loadCapability.mockResolvedValue(ACTIVE_CAPABILITY);
    mocks.checkCapability.mockReturnValue({ allowed: true });

    const result = await releaseCollection('col-1', { now: NOW });

    expect(mocks.loadCapability).toHaveBeenCalledOnce();
    expect(db._updateMany).toHaveBeenCalledOnce();
    expect(result.publishedCount).toBe(2);
  });

  it('blocks the release when the MTO capability is missing', async () => {
    mocks.findById.mockResolvedValue(scheduledCollection);
    const db = makeDb({ products: [mtoProductDoc], designs: [cadCastDesign] });
    mocks.dbConnect.mockResolvedValue(db);
    mocks.loadCapability.mockResolvedValue(null);
    mocks.checkCapability.mockReturnValue({ allowed: false, reason: 'MTO checkout capability is not registered.' });

    await expect(releaseCollection('col-1', { now: NOW })).rejects.toThrow(/Collection release blocked/);
    expect(db._updateMany).not.toHaveBeenCalled();
  });

  it('blocks the release when the capability is inactive', async () => {
    mocks.findById.mockResolvedValue(scheduledCollection);
    const db = makeDb({ products: [mtoProductDoc], designs: [cadCastDesign] });
    mocks.dbConnect.mockResolvedValue(db);
    mocks.loadCapability.mockResolvedValue({ ...ACTIVE_CAPABILITY, active: false });
    mocks.checkCapability.mockReturnValue({ allowed: false, reason: 'MTO checkout capability is not active.' });

    await expect(releaseCollection('col-1', { now: NOW })).rejects.toThrow(/Collection release blocked/);
    expect(db._updateMany).not.toHaveBeenCalled();
  });

  it('releases a collection where the only MTO product is handmade (exempt)', async () => {
    const handmadeMtoProduct = {
      ...mtoProductDoc,
      productId: 'jwl_handmade_1',
      designId: 'design-handmade-001',
    };
    const handmadeCollection = {
      ...scheduledCollection,
      members: [{ productId: 'jwl_handmade_1' }],
    };
    mocks.findById.mockResolvedValue(handmadeCollection);
    const db = makeDb({ products: [handmadeMtoProduct], designs: [handmadeDesign] });
    mocks.dbConnect.mockResolvedValue(db);

    await releaseCollection('col-1', { now: NOW });

    expect(mocks.loadCapability).not.toHaveBeenCalled();
    expect(db._updateMany).toHaveBeenCalledOnce();
  });

  it('returns alreadyReleased without a capability check for an already-released collection', async () => {
    mocks.findById.mockResolvedValue({ ...scheduledCollection, status: COLLECTION_STATUS.RELEASED });

    const result = await releaseCollection('col-1', { now: NOW });

    expect(result.alreadyReleased).toBe(true);
    expect(mocks.loadCapability).not.toHaveBeenCalled();
  });
});
