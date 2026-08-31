import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The live configurator price the customer is charged.
 *
 * This exists because of a real escape: `priceSelection` moved the casting house's flat
 * print/sprue fee out of `breakdown.metal` into its own `breakdown.printSetup` (fixing a
 * per-slot double-charge), and this route — which assembles the RETAIL breakdown by hand —
 * didn't follow it. The fee silently disappeared from every configured price. The engine's
 * own tests still passed, because the loss happened in the assembly here.
 */

const mocks = vi.hoisted(() => ({ connect: vi.fn(), findOne: vi.fn(), designFindById: vi.fn() }));

vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn((data, init) => ({ _data: data, _status: init?.status ?? 200 })) },
}));
vi.mock('@/lib/database', () => ({ db: { connect: mocks.connect } }));
vi.mock('@/app/api/designs/model', () => ({ default: { findById: mocks.designFindById } }));
vi.mock('@/lib/rateLimit', () => ({ consumeRateLimit: vi.fn(async () => ({ allowed: true })) }));
vi.mock('@/services/production/dailyMetalSnapshot', () => ({
  currentPriceDay: () => '2026-08-25',
  getDailyMetalSnapshot: vi.fn(async () => ({
    priceDay: '2026-08-25',
    rates: { gold: 100, silver: 1, platinum: 40, palladium: 40 },
    capturedAt: new Date(0),
  })),
}));

import { POST } from './route.js';
import { estimateMetalCost } from '@/services/production/designCost';

const RATES = { gold: 100, silver: 1, platinum: 40, palladium: 40 };
const MARKUP = 2.5;

const design = {
  designID: 'd1',
  stlVolumeCm3: 4,
  metalOptions: ['GOLD_18K_YELLOW'],
  bom: { findings: [] },
  viewer: {
    meshMap: [{
      nameContains: 'mounting',
      type: 'metal',
      finish: 'yellow',
      volumeCm3: 4,
      customizable: {
        label: 'Band metal',
        default: 'yellow',
        options: [{ finish: 'yellow', binding: { metalKey: 'GOLD_18K_YELLOW' } }],
      },
    }],
  },
};

const req = (body) => ({
  headers: { get: () => null },
  nextUrl: { searchParams: { get: () => null } },
  json: async () => body,
});

const selection = { resolvedMeshMap: [{ nameContains: 'mounting', type: 'metal', finish: 'yellow' }] };

describe('POST /api/refrakt-price', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.designFindById.mockResolvedValue(design);
    mocks.connect.mockResolvedValue({
      collection: (name) => ({
        findOne: async () => (name === 'adminSettings'
          ? { financial: { cogMarkup: MARKUP }, pricing: { taxRate: 0, gemPrices: {} } }
          : null),
      }),
    });
  });

  it("CHARGES the casting house's print/sprue fee — it must not vanish from the price", async () => {
    const res = await POST(req({ designID: 'd1', selection }));
    const { metalOnlyCost, printSetupFee } = estimateMetalCost({ volumeCm3: 4, metalKey: 'GOLD_18K_YELLOW', metalPrices: RATES });

    expect(printSetupFee).toBeGreaterThan(0); // guards the premise of this test
    expect(res._data.breakdown.labor).toBeCloseTo(printSetupFee * MARKUP, 2);
    expect(res._data.subtotal).toBeCloseTo((metalOnlyCost + printSetupFee) * MARKUP, 2);
  });

  it('charges the print fee ONCE on a two-tone piece, not once per metal slot', async () => {
    const twoTone = {
      ...design,
      viewer: {
        meshMap: [
          { nameContains: 'band', type: 'metal', finish: 'yellow', volumeCm3: 2, customizable: { default: 'yellow', options: [{ finish: 'yellow', binding: { metalKey: 'GOLD_18K_YELLOW' } }] } },
          { nameContains: 'prongs', type: 'metal', finish: 'white', volumeCm3: 2, customizable: { default: 'white', options: [{ finish: 'white', binding: { metalKey: 'GOLD_18K_WHITE' } }] } },
        ],
      },
    };
    mocks.designFindById.mockResolvedValue(twoTone);
    const res = await POST(req({
      designID: 'd1',
      selection: { resolvedMeshMap: [
        { nameContains: 'band', type: 'metal', finish: 'yellow' },
        { nameContains: 'prongs', type: 'metal', finish: 'white' },
      ] },
    }));

    const oneFee = estimateMetalCost({ volumeCm3: 2, metalKey: 'GOLD_18K_YELLOW', metalPrices: RATES }).printSetupFee;
    // Two slots, one print job — the fee appears once, at retail.
    expect(res._data.breakdown.labor).toBeCloseTo(oneFee * MARKUP, 2);
  });

  it('never leaks costBasis to the caller — the shop must not receive COGS', async () => {
    const res = await POST(req({ designID: 'd1', selection }));
    expect(res._data).not.toHaveProperty('costBasis');
    expect(res._data.breakdown).not.toHaveProperty('printSetup'); // retail buckets only
  });
});
