import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolvePricingSettings } from '@/services/pricing/engine';

/**
 * The wholesale price sheet, priced by THE engine (services/pricing/engine.js) — not a mock of it. What
 * must hold:
 *   1. every number is the engine's, the same one the counter charges
 *   2. metal-dependent tasks show per-metal prices; metal-independent ones collapse to one flat price
 *   3. a metal the engine refuses (no stock) is OMITTED, never $0; a task priceable nowhere is dropped
 *   4. metal-restricted tasks only show their metals
 *   5. volume tiers come from the engine, margin share included (EFD-DEFECTS P10)
 *   6. internals never cross to a partner
 */
const mocks = vi.hoisted(() => ({ requireRole: vi.fn(), getTasks: vi.fn(), loadCtx: vi.fn() }));

vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn((data, init) => ({ _data: data, _status: init?.status ?? 200 })) },
}));
vi.mock('@/lib/apiAuth', () => ({ requireRole: mocks.requireRole }));
vi.mock('@/app/api/tasks/model', () => ({ TasksModel: { getTasks: mocks.getTasks } }));
vi.mock('@/services/pricing/catalog', async (importOriginal) => ({
  ...(await importOriginal()),
  loadPricingContext: mocks.loadCtx,
}));

const { GET } = await import('./route.js');

const TIERS = [
  { minQty: 1, toolPct: 100, marginPct: 100 },
  { minQty: 5, toolPct: 70, marginPct: 100 },
  { minQty: 20, toolPct: 30, marginPct: 100 },
];
const settingsWith = (tiers = TIERS) => resolvePricingSettings({
  pricing: {
    wage: 50, administrativeFee: 0.25, businessFee: 0.5, consumablesFee: 0.25, wholesaleMarkup: 1.2,
    rushMultiplier: 1.5, deliveryFee: 5, taxRate: 0.095, minimumTaskRetailPrice: 0, minimumTaskWholesalePrice: 0,
    quantityTiers: tiers,
  },
});

const SOLDER = {
  _id: 'm-solder', displayName: 'Hard Solder', isMetalDependent: true, portionsPerUnit: 30,
  stullerProducts: [
    { metalType: 'sterling_silver', karat: '925', stullerPrice: 12, portionsPerUnit: 60 },
    { metalType: 'yellow_gold', karat: '14K', stullerPrice: 134.55 },
    { metalType: 'platinum', karat: '950', stullerPrice: 300 },
  ],
};
const sizeDown = { title: 'Size Down', category: 'shanks', processes: [{ laborHours: 0.3, quantity: 1 }], materials: [{ materialId: 'm-solder', quantity: 1 }] };
const cleanPolish = { title: 'Clean and Polish', category: 'misc', processes: [{ laborHours: 0.25, quantity: 1 }], materials: [] };
const retip = { title: 'Retip prongs', category: 'prongs', processes: [{ laborHours: 0.2, quantity: 1 }], materials: [], tools: [{ toolId: 't', costPerUse: 10 }] };

const ctx = (materials = [SOLDER], tiers = TIERS) => ({
  settings: settingsWith(tiers), materials, tools: [],
  metals: ['sterling_silver_925', 'yellow_gold_14k', 'platinum_950'],
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue({ session: { user: { role: 'wholesaler' } }, errorResponse: null });
  mocks.loadCtx.mockResolvedValue(ctx());
});

const rowsFor = async (tasks) => {
  mocks.getTasks.mockResolvedValue({ tasks });
  return (await GET())._data.rows;
};

describe('GET /api/wholesale/price-sheet', () => {
  it('prices a metal-dependent task per metal, with the engine', async () => {
    const [row] = await rowsFor([sizeDown]);
    // $15 labor + the metal's solder portion, × 1.2
    expect(row.byMetal).toEqual({ sterling_silver_925: 18.24, yellow_gold_14k: 23.39, platinum_950: 30 });
    expect(row.wholesalePrice).toBeUndefined();
    expect(row.laborHours).toBe(0.3);
  });

  it('collapses a metal-independent task to one flat price', async () => {
    const [row] = await rowsFor([cleanPolish]);
    expect(row).toMatchObject({ wholesalePrice: 15 });
    expect(row.byMetal).toBeUndefined();
  });

  it('OMITS a metal the stock does not cover — never $0', async () => {
    mocks.loadCtx.mockResolvedValue(ctx([{ ...SOLDER, stullerProducts: SOLDER.stullerProducts.filter((p) => p.metalType !== 'platinum') }]));
    const [row] = await rowsFor([sizeDown]);
    expect(row.byMetal).not.toHaveProperty('platinum_950');
    expect(Object.keys(row.byMetal)).toEqual(['sterling_silver_925', 'yellow_gold_14k']);
  });

  it('prices a metal-restricted task only in its metals, and keeps the label', async () => {
    const [row] = await rowsFor([{ ...sizeDown, title: 'Size Down — Platinum', metals: ['platinum'] }]);
    expect(row.byMetal).toEqual({ platinum_950: 30 });
    expect(row.wholesalePrice).toBeUndefined();
  });

  it('drops a task that cannot be priced in any metal', async () => {
    mocks.loadCtx.mockResolvedValue(ctx([]));
    expect(await rowsFor([sizeDown])).toHaveLength(0);
  });

  it('refuses the whole sheet when pricing settings are missing', async () => {
    mocks.loadCtx.mockRejectedValue(new Error('Pricing settings are missing or invalid: wage.'));
    mocks.getTasks.mockResolvedValue({ tasks: [cleanPolish] });
    const res = await GET();
    expect(res._status).toBe(500);
  });

  it('never leaks internals', async () => {
    const json = JSON.stringify(await rowsFor([sizeDown, cleanPolish, retip]));
    for (const secret of ['laborCost', 'baseCost', 'retailPrice', 'materialsCost', 'toolCost']) expect(json).not.toContain(secret);
  });

  it('honors the role gate', async () => {
    mocks.requireRole.mockResolvedValue({ session: null, errorResponse: { _status: 403 } });
    const res = await GET();
    expect(res._status).toBe(403);
    expect(mocks.getTasks).not.toHaveBeenCalled();
  });
});

describe('volume pricing on the sheet', () => {
  it('shows each tier price on a single-price row', async () => {
    // $10 labor + $10 of machine = $20 base, ×1.2 = $24 wholesale
    const [row] = await rowsFor([retip]);
    expect(row.wholesalePrice).toBe(24);
    expect(row.volumeTiers).toEqual([
      { minQty: 5, label: '5–19', unitDiscount: 3.6, price: 20.4 },
      { minQty: 20, label: '20+', unitDiscount: 8.4, price: 15.6 },
    ]);
  });

  it('gives a metal-priced row the one deduction, since it is the same in every metal', async () => {
    const reprong = { ...retip, title: 'Reprong', materials: [{ materialId: 'm-solder', quantity: 1 }] };
    const [row] = await rowsFor([reprong]);
    expect(row.byMetal).toBeTruthy();
    expect(row.volumeTiers).toEqual([
      { minQty: 5, label: '5–19', unitDiscount: 3.6 },
      { minQty: 20, label: '20+', unitDiscount: 8.4 },
    ]);
  });

  it('honors the margin share too — the old sheet ignored it (P10)', async () => {
    mocks.loadCtx.mockResolvedValue(ctx([SOLDER], [{ minQty: 1, toolPct: 100, marginPct: 100 }, { minQty: 10, toolPct: 100, marginPct: 50 }]));
    const [row] = await rowsFor([cleanPolish]);
    // $12.50 base, ×1.2 = $15; at half the margin: $12.50 × 1.1 = $13.75
    expect(row.volumeTiers).toEqual([{ minQty: 10, label: '10+', unitDiscount: 1.25, price: 13.75 }]);
  });

  it('says nothing on a task with no machine in it, and nothing when the ladder is off', async () => {
    expect((await rowsFor([cleanPolish]))[0].volumeTiers).toBeUndefined();
    mocks.loadCtx.mockResolvedValue(ctx([SOLDER], []));
    expect((await rowsFor([retip]))[0].volumeTiers).toBeUndefined();
  });
});
