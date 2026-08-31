import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The wholesale price sheet. Two things matter:
 *   1. only priceable rows appear, priced at WHOLESALE
 *   2. the shop's internals (labor cost, base cost, retail margin structure)
 *      NEVER cross to a partner — the projection is allowlist-shaped, so a new
 *      field on tasks cannot silently leak onto the sheet.
 */

const mocks = vi.hoisted(() => ({ requireRole: vi.fn(), getTasks: vi.fn() }));

vi.mock('next/server', () => ({
  NextResponse: { json: vi.fn((data, init) => ({ _data: data, _status: init?.status ?? 200 })) },
}));
vi.mock('@/lib/apiAuth', () => ({ requireRole: mocks.requireRole }));
vi.mock('@/app/api/tasks/service', () => ({ TasksService: { getTasks: mocks.getTasks } }));

const { GET } = await import('./route.js');

const task = (over = {}) => ({
  title: 'Ring Sizing Down',
  category: 'sizing',
  sku: 'RS-01',
  laborHours: 0.5,
  pricing: { wholesalePrice: 45, retailPrice: 90, laborCost: 22.5, baseCost: 30 },
  universalPricing: null,
  internalNotes: 'shop-only',
  processes: [{ secret: 'recipe' }],
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireRole.mockResolvedValue({ session: { user: { role: 'wholesaler' } }, errorResponse: null });
  mocks.getTasks.mockResolvedValue({ success: true, data: [task()] });
});

describe('GET /api/wholesale/price-sheet', () => {
  it('admits wholesalers and asks for active tasks only', async () => {
    await GET();
    expect(mocks.requireRole).toHaveBeenCalledWith(['wholesaler', 'admin', 'dev']);
    expect(mocks.getTasks).toHaveBeenCalledWith(expect.objectContaining({ isActive: true }));
  });

  it('returns the wholesale price and NOTHING internal', async () => {
    const res = await GET();
    const row = res._data.rows[0];
    expect(row).toEqual({
      title: 'Ring Sizing Down',
      category: 'sizing',
      sku: 'RS-01',
      laborHours: 0.5,
      wholesalePrice: 45,
    });
    // The assertions that matter: the shop's cost structure stays home.
    const json = JSON.stringify(res._data);
    expect(json).not.toContain('laborCost');
    expect(json).not.toContain('baseCost');
    expect(json).not.toContain('retailPrice');
    expect(json).not.toContain('shop-only');
    expect(json).not.toContain('recipe');
  });

  it('per-metal pricing carries only the wholesale side', async () => {
    mocks.getTasks.mockResolvedValue({
      success: true,
      data: [task({
        pricing: { wholesalePrice: 0 },
        universalPricing: {
          silver: { retailPrice: 60, wholesalePrice: 30 },
          gold_14k: { retailPrice: 120, wholesalePrice: 65 },
          platinum: { retailPrice: 200, wholesalePrice: 0 }, // unpriced metal drops out
        },
      })],
    });
    const res = await GET();
    expect(res._data.rows[0].byMetal).toEqual({ silver: 30, gold_14k: 65 });
    expect(JSON.stringify(res._data)).not.toContain('retailPrice');
  });

  it('drops a task with no wholesale price anywhere — never prints $0', async () => {
    mocks.getTasks.mockResolvedValue({
      success: true,
      data: [task({ pricing: { wholesalePrice: 0 }, universalPricing: {} })],
    });
    const res = await GET();
    expect(res._data.rows).toHaveLength(0);
  });

  it('honors the role gate', async () => {
    mocks.requireRole.mockResolvedValue({ session: null, errorResponse: { _status: 403 } });
    const res = await GET();
    expect(res._status).toBe(403);
    expect(mocks.getTasks).not.toHaveBeenCalled();
  });
});
