import { describe, expect, it } from 'vitest';
import {
  MTO_CAPABILITY_VERSION,
  isRevisedMtoProduct,
  isHandmadeDesign,
  productNeedsMtoGate,
  checkMtoCapabilityRecord,
} from '@/lib/mtoCapabilityGate';

const RECENT = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago — fresh

const ACTIVE_RECORD = {
  key: 'mtoCheckoutCapacity',
  version: MTO_CAPABILITY_VERSION,
  active: true,
  updatedAt: RECENT,
};

function mtoProduct(overrides = {}) {
  return {
    designId: 'design-ring-001',
    variants: [
      {
        variantId: 'v1',
        active: true,
        offers: { madeToOrder: { enabled: true, leadTimeDays: 21 } },
      },
    ],
    ...overrides,
  };
}

function rtsProduct() {
  return {
    designId: 'design-ring-001',
    variants: [
      {
        variantId: 'v1',
        active: true,
        offers: { readyToShip: { quantity: 1, pieceIDs: ['piece-001'] } },
      },
    ],
  };
}

describe('isRevisedMtoProduct', () => {
  it('returns true for a Design-backed product with an active MTO variant', () => {
    expect(isRevisedMtoProduct(mtoProduct())).toBe(true);
  });

  it('returns false when designId is absent (legacy / non-revised product)', () => {
    expect(isRevisedMtoProduct({ variants: [{ active: true, offers: { madeToOrder: { enabled: true } } }] })).toBe(false);
  });

  it('returns false when no active variant has madeToOrder.enabled', () => {
    expect(isRevisedMtoProduct(rtsProduct())).toBe(false);
  });

  it('returns false when the only MTO variant is inactive', () => {
    expect(
      isRevisedMtoProduct({
        designId: 'd1',
        variants: [{ variantId: 'v1', active: false, offers: { madeToOrder: { enabled: true } } }],
      }),
    ).toBe(false);
  });

  it('returns false for null / undefined', () => {
    expect(isRevisedMtoProduct(null)).toBe(false);
    expect(isRevisedMtoProduct(undefined)).toBe(false);
    expect(isRevisedMtoProduct({})).toBe(false);
  });
});

describe('isHandmadeDesign', () => {
  it('returns true only for handmade productionMethod', () => {
    expect(isHandmadeDesign({ productionMethod: 'handmade' })).toBe(true);
    expect(isHandmadeDesign({ productionMethod: 'cad_cast' })).toBe(false);
    expect(isHandmadeDesign({ productionMethod: 'hybrid' })).toBe(false);
    expect(isHandmadeDesign(null)).toBe(false);
    expect(isHandmadeDesign({})).toBe(false);
  });
});

describe('productNeedsMtoGate', () => {
  it('requires the gate for a revised MTO product with a non-handmade design', () => {
    expect(productNeedsMtoGate(mtoProduct(), { productionMethod: 'cad_cast' })).toBe(true);
    expect(productNeedsMtoGate(mtoProduct(), { productionMethod: 'hybrid' })).toBe(true);
  });

  it('exempts revised MTO products whose design is handmade', () => {
    expect(productNeedsMtoGate(mtoProduct(), { productionMethod: 'handmade' })).toBe(false);
  });

  it('does not require the gate for ready-to-ship products', () => {
    expect(productNeedsMtoGate(rtsProduct(), { productionMethod: 'cad_cast' })).toBe(false);
  });

  it('does not require the gate for products without a designId', () => {
    const legacy = { variants: [{ active: true, offers: { madeToOrder: { enabled: true } } }] };
    expect(productNeedsMtoGate(legacy, null)).toBe(false);
  });

  it('fails closed when design is null (unknown production method is not exempt)', () => {
    expect(productNeedsMtoGate(mtoProduct(), null)).toBe(true);
  });
});

describe('checkMtoCapabilityRecord', () => {
  it('allows publication when the capability is active and fresh', () => {
    expect(checkMtoCapabilityRecord(ACTIVE_RECORD).allowed).toBe(true);
  });

  it('fails closed when the record is missing', () => {
    const result = checkMtoCapabilityRecord(null);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/not registered/);
  });

  it('fails closed when the capability is inactive', () => {
    const result = checkMtoCapabilityRecord({ ...ACTIVE_RECORD, active: false });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/not active/);
  });

  it('fails closed when the capability version is incompatible', () => {
    const result = checkMtoCapabilityRecord({ ...ACTIVE_RECORD, version: 999 });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/incompatible/);
  });

  it('fails closed when the capability record is stale (>72 h since last update)', () => {
    const staleUpdatedAt = new Date(Date.now() - 73 * 60 * 60 * 1000);
    const result = checkMtoCapabilityRecord({ ...ACTIVE_RECORD, updatedAt: staleUpdatedAt });
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/stale/);
  });

  it('fails closed when updatedAt is absent', () => {
    const { updatedAt: _removed, ...noTs } = ACTIVE_RECORD;
    const result = checkMtoCapabilityRecord(noTs);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/stale/);
  });

  it('allows publication exactly at the staleness boundary', () => {
    const justFresh = new Date(Date.now() - 71 * 60 * 60 * 1000);
    expect(checkMtoCapabilityRecord({ ...ACTIVE_RECORD, updatedAt: justFresh }).allowed).toBe(true);
  });
});
