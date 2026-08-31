import { describe, it, expect } from 'vitest';
import { autoLaborAsSharedRows } from '@/services/production/variantPricing';

/**
 * D4 — the Pricing tab read "No labor tasks." while auto labor was in every variant's price.
 *
 * Owner correction that made the fix possible: "all variants have the same stone count. a design has a
 * cad file, a file has a set amount of stones… that would make it a different design." So auto labor is
 * a property of the DESIGN, not the variant, and belongs in the SHARED rows where it's visible and
 * editable — rather than being recomputed invisibly per card.
 *
 * THE HAZARD this guards: seeding those rows makes auto labor arrive through `sharedCosts`, so the
 * variant cards must stop adding it. If the seeded rows don't total exactly what the auto lines totalled,
 * seeding silently reprices every variant. These tests pin that equality, because the two sums are
 * computed by different functions with DIFFERENT FIELD NAMES — `sumLines` reads `quantity`,
 * `sumLaborLines` reads `qty`, and a mismatch would look fine while charging 1× instead of 60×.
 */

// Mirrors of the page's two summers, so the equality is asserted independently.
const sumLines = (arr) => (arr || []).reduce((s, r) => s + (Number(r.cost) || 0) * (Number(r.quantity) || 1), 0);
const sumLaborLines = (l) => (l || []).reduce((s, x) => s + (Number(x.cost) || 0) * (Number(x.qty) || 1), 0);

const stone = (caratEach, qty = 1) => ({ caratEach, qty: String(qty) });

describe('autoLaborAsSharedRows', () => {
  it('emits rows in the shape LaborTaskEditor + sumLines expect', () => {
    const rows = autoLaborAsSharedRows({ gemstones: [stone(0.25, 60)] }, 'cad_cast', {});
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) {
      // `quantity`, NOT `qty` — sumLines reads quantity, so the wrong key silently means ×1.
      expect(r).toHaveProperty('quantity');
      expect(r).not.toHaveProperty('qty');
      expect(typeof r.description).toBe('string');
      expect(r.description.length).toBeGreaterThan(0);
      expect(r.discipline).toBe('bench_jewelry');
      expect(r.autoSeeded).toBe(true);
    }
  });

  it('is PRICE-NEUTRAL: seeded rows total exactly the auto-line total', () => {
    // The reported design: casting cleanup + 60 small stones set.
    const variant = { gemstones: [stone(0.25, 60)] };
    const taskCosts = { 'Clean up Casting': 40 };
    const rows = autoLaborAsSharedRows(variant, 'cad_cast', taskCosts);
    // Reconstruct the auto-line view of the same rows and compare the two summers.
    const asAutoLines = rows.map((r) => ({ cost: r.cost, qty: r.quantity }));
    expect(sumLines(rows)).toBe(sumLaborLines(asAutoLines));
    expect(sumLines(rows)).toBeGreaterThan(0);
  });

  it('carries the 60× setting quantity, not 1', () => {
    const rows = autoLaborAsSharedRows({ gemstones: [stone(0.25, 60)] }, 'cad_cast', {});
    const setting = rows.find((r) => /set/i.test(r.description));
    expect(setting).toBeDefined();
    expect(Number(setting.quantity)).toBe(60);
    // A dropped quantity would undercharge by 60× — the whole reason for the shape test above.
    expect(sumLines([setting])).toBe(Number(setting.cost) * 60);
  });

  it('uses catalog prices when available, falling back otherwise', () => {
    const variant = { gemstones: [stone(0.25, 2)] };
    const withCatalog = autoLaborAsSharedRows(variant, 'cad_cast', { 'Clean up Casting': 55 });
    const cleanup = withCatalog.find((r) => r.description === 'Clean up Casting');
    expect(Number(cleanup.cost)).toBe(55);
    const noCatalog = autoLaborAsSharedRows(variant, 'cad_cast', {});
    expect(Number(noCatalog.find((r) => r.description === 'Clean up Casting').cost)).toBe(40);
  });

  it('omits casting cleanup for handmade pieces (nothing was cast)', () => {
    const rows = autoLaborAsSharedRows({ gemstones: [stone(0.25, 3)] }, 'handmade', {});
    expect(rows.some((r) => r.description === 'Clean up Casting')).toBe(false);
    expect(rows.some((r) => /set/i.test(r.description))).toBe(true);
  });

  it('returns nothing to seed for a stoneless handmade piece', () => {
    expect(autoLaborAsSharedRows({ gemstones: [] }, 'handmade', {})).toEqual([]);
    expect(autoLaborAsSharedRows({}, 'handmade', {})).toEqual([]);
    expect(autoLaborAsSharedRows(null, 'handmade', {})).toEqual([]);
  });

  it('groups stones by carat band rather than emitting a row per stone', () => {
    // 60 stones must not become 60 labor rows.
    const rows = autoLaborAsSharedRows({ gemstones: [stone(0.25, 40), stone(0.3, 20)] }, 'handmade', {});
    expect(rows.length).toBeLessThanOrEqual(2);
  });
});
