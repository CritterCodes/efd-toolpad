import { describe, expect, it } from 'vitest';
import { resolveFee, resolveFeeMode } from '@/services/billing/feeResolver';

const consignment = { custody: 'consignment', fulfilledBy: 'efd' };
const marketplace = { custody: 'artisan_held', fulfilledBy: 'artisan' };
const hybrid = { custody: 'artisan_held', fulfilledBy: 'efd' }; // minisite-ish: their goods, EFD ships

describe('resolveFeeMode', () => {
  it('classifies the continuum ends + middle', () => {
    expect(resolveFeeMode(consignment)).toBe('consignment');
    expect(resolveFeeMode(marketplace)).toBe('marketplace');
    expect(resolveFeeMode(hybrid)).toBe('hybrid');
  });
});

describe('resolveFee', () => {
  it('charges most for consignment, least for marketplace, hybrid in between', () => {
    const c = resolveFee({ lineTotal: 1000, context: consignment });
    const h = resolveFee({ lineTotal: 1000, context: hybrid });
    const m = resolveFee({ lineTotal: 1000, context: marketplace });

    expect(c.efdFee).toBeGreaterThan(h.efdFee);
    expect(h.efdFee).toBeGreaterThan(m.efdFee);
    // defaults: consignment 0.20, marketplace 0.15, hybrid = storefront .15 + fulfillment .02 = .17
    expect(c.efdFee).toBeCloseTo(200, 2);
    expect(m.efdFee).toBeCloseTo(150, 2);
    expect(h.efdFee).toBeCloseTo(170, 2);
    expect(c.artisanPayout).toBeCloseTo(800, 2);
  });

  it('is backward-compatible with a flat consignment rate (legacy path)', () => {
    const r = resolveFee({ lineTotal: 1000, consignmentRate: 0.2 });
    expect(r.mode).toBe('consignment');
    expect(r.basis.legacy).toBe(true);
    expect(r.efdFee).toBeCloseTo(200, 2);
    expect(r.artisanPayout).toBeCloseTo(800, 2);
  });
});
