import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The wholesale price sheet, priced through the INTAKE ENGINE per metal.
 * This shape exists because v1 read the stored base-metal wholesalePrice and
 * quoted gold work at silver-ish prices (a half-shank is ~$40 in silver and
 * ~$290 in 14k — the owner caught it on sight). What must hold now:
 *   1. every row is calculateTaskCost output — the number intake charges
 *   2. metal-dependent tasks show per-metal prices; metal-independent collapse flat
 *   3. a metal the engine can't price is OMITTED, never $0
 *   4. the shop's internals still never cross
 */

const mocks = vi.hoisted(() => ({ requireRole: vi.fn(), getTasks: vi.fn(), loadDeps: vi.fn(), calc: vi.fn() }));

vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn((data, init) => ({ _data: data, _status: init?.status ?? 200 })) },
}));
vi.mock('@/lib/apiAuth', () => ({ requireRole: mocks.requireRole }));
vi.mock('@/app/api/tasks/service', () => ({
  TasksService: { getTasks: mocks.getTasks, loadPricingDependencies: mocks.loadDeps },
}));
vi.mock('@/services/pricing/task.pricing', () => ({ calculateTaskCost: mocks.calc }));

const { GET } = await import('./route.js');

const metalMaterial = {
  isMetalDependent: true,
  stullerProducts: [
    { metalType: 'sterling_silver', karat: '925' },
    { metalType: 'yellow_gold', karat: '14K' },
  ],
};

const task = (over = {}) => ({
  title: 'Half-Shank', category: 'shanks', sku: 'HS-1', laborHours: 1,
  pricing: { wholesalePrice: 40, laborCost: 20, baseCost: 25 },
  ...over,
});

const priced = (wholesale, unmatched = []) => ({
  wholesalePrice: wholesale, retailPrice: wholesale * 2, laborCost: 11, baseCost: 22,
  unmatchedMaterials: unmatched,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue({ session: { user: { role: 'wholesaler' } }, errorResponse: null });
  mocks.getTasks.mockResolvedValue({ success: true, data: [task()] });
  mocks.loadDeps.mockResolvedValue({ adminSettings: { s: 1 }, materials: [metalMaterial] });
});

describe('GET /api/wholesale/price-sheet', () => {
  it('prices each available metal context through the intake engine', async () => {
    mocks.calc.mockImplementation((t, s, p, m, ctx) => {
      if (ctx === 'sterling_silver_925') return priced(40);
      if (ctx === 'yellow_gold_14k') return priced(289.73);
      return priced(40); // base
    });
    const res = await GET();
    const row = res._data.rows[0];
    expect(row.byMetal).toEqual({ sterling_silver_925: 40, yellow_gold_14k: 289.73 });
    expect(row.wholesalePrice).toBeUndefined(); // metal-dependent → never one flat number
    // contexts derive from material variants — engine called with each, plus base
    const ctxCalls = mocks.calc.mock.calls.map((c) => c[4]);
    expect(ctxCalls).toContain('sterling_silver_925');
    expect(ctxCalls).toContain('yellow_gold_14k');
  });

  it('collapses a metal-independent task to one flat price', async () => {
    mocks.calc.mockImplementation(() => priced(15));
    const res = await GET();
    expect(res._data.rows[0]).toMatchObject({ wholesalePrice: 15 });
    expect(res._data.rows[0].byMetal).toBeUndefined();
  });

  it('OMITS a metal the engine cannot price — quote on request beats $0', async () => {
    mocks.calc.mockImplementation((t, s, p, m, ctx) => {
      if (ctx === 'yellow_gold_14k') return priced(0, [{ name: 'Sizing Stock', requested: ctx }]);
      return priced(40);
    });
    const res = await GET();
    expect(res._data.rows[0].byMetal ?? { flatOnly: res._data.rows[0].wholesalePrice }).not.toHaveProperty('yellow_gold_14k');
    expect(JSON.stringify(res._data)).not.toContain('yellow_gold_14k');
  });

  it('a metal-RESTRICTED task prices only its metals and keeps the label', async () => {
    // Platinum work is laser welded and has its own task; it must never render
    // gold chips, and even a single platinum price stays labeled, never flat.
    mocks.getTasks.mockResolvedValue({
      success: true,
      data: [task({ title: 'Half-Shank — Platinum', metals: ['platinum'] })],
    });
    mocks.loadDeps.mockResolvedValue({
      adminSettings: {},
      materials: [{
        isMetalDependent: true,
        stullerProducts: [
          { metalType: 'sterling_silver', karat: '925' },
          { metalType: 'yellow_gold', karat: '14K' },
          { metalType: 'platinum', karat: '950' },
        ],
      }],
    });
    mocks.calc.mockImplementation((t, s, p, m, ctx) => priced(ctx === 'platinum_950' ? 474.24 : 40));
    const res = await GET();
    const row = res._data.rows[0];
    expect(row.byMetal).toEqual({ platinum_950: 474.24 });
    expect(row.wholesalePrice).toBeUndefined();
    const ctxCalls = mocks.calc.mock.calls.map((c) => c[4]).filter(Boolean);
    expect(ctxCalls).toEqual(['platinum_950']); // gold/silver never even computed
  });

  it('drops a task the engine cannot price at all', async () => {
    mocks.calc.mockImplementation(() => { throw new Error('bad task'); });
    const res = await GET();
    expect(res._data.rows).toHaveLength(0);
  });

  it('still never leaks internals', async () => {
    mocks.calc.mockImplementation(() => priced(40));
    const res = await GET();
    const json = JSON.stringify(res._data);
    expect(json).not.toContain('laborCost');
    expect(json).not.toContain('baseCost');
    expect(json).not.toContain('retailPrice');
  });

  it('honors the role gate', async () => {
    mocks.requireRole.mockResolvedValue({ session: null, errorResponse: { _status: 403 } });
    const res = await GET();
    expect(res._status).toBe(403);
    expect(mocks.getTasks).not.toHaveBeenCalled();
  });
});
