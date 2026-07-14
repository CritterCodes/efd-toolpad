import { describe, it, expect } from 'vitest';
import { filterCatalog, catalogStats, getProductThumb, formatPrice, formatMargin } from './catalogFilter';

const PRODUCTS = [
  { _id: '1', title: 'Ruby Ring', productType: 'jewelry', status: 'active', price: 500, artisanId: 'art1', createdAt: '2026-01-01' },
  { _id: '2', title: 'Raw Emerald', productType: 'gemstone', status: 'draft', price: 200, artisanId: 'art2', createdAt: '2026-02-01' },
  { _id: '3', title: 'Gold Necklace', productType: 'jewelry', status: 'draft', artisanId: 'art1', createdAt: '2026-03-01' },
  { _id: '4', title: 'Sapphire Loose', productType: 'gemstone', status: 'active', price: 800, artisanId: 'art1', inventory: { available: 0 }, createdAt: '2026-04-01' },
  { _id: '5', title: 'Parked Concept', productType: 'concept', status: 'draft', createdAt: '2026-05-01' },
];

describe('filterCatalog', () => {
  it('returns all products with default options', () => {
    expect(filterCatalog(PRODUCTS).length).toBe(4);
  });

  it('filters by type=jewelry', () => {
    const r = filterCatalog(PRODUCTS, { type: 'jewelry' });
    expect(r.every((p) => p.productType === 'jewelry')).toBe(true);
    expect(r.length).toBe(2);
  });

  it('filters by type=gemstone', () => {
    const r = filterCatalog(PRODUCTS, { type: 'gemstone' });
    expect(r.every((p) => p.productType === 'gemstone')).toBe(true);
    expect(r.length).toBe(2);
  });

  it('filters by status=draft', () => {
    const r = filterCatalog(PRODUCTS, { status: 'draft' });
    expect(r.length).toBe(2);
  });

  it('filters by artisanId', () => {
    const r = filterCatalog(PRODUCTS, { artisanId: 'art1' });
    expect(r.length).toBe(3);
  });

  it('filters by search term', () => {
    const r = filterCatalog(PRODUCTS, { search: 'emerald' });
    expect(r.length).toBe(1);
    expect(r[0].title).toBe('Raw Emerald');
  });

  it('sorts by newest (default)', () => {
    const r = filterCatalog(PRODUCTS);
    expect(r[0]._id).toBe('4');
  });

  it('sorts by title', () => {
    const r = filterCatalog(PRODUCTS, { sort: 'title' });
    expect(r[0].title).toBe('Gold Necklace');
  });

  it('sorts by price_asc', () => {
    const r = filterCatalog(PRODUCTS, { sort: 'price_asc' });
    expect(r[0]._id).toBe('3'); // no price → 0
  });

  it('sorts by price_desc', () => {
    const r = filterCatalog(PRODUCTS, { sort: 'price_desc' });
    expect(r[0]._id).toBe('4'); // price 800
  });
});

describe('catalogStats', () => {
  it('counts total, active, draft, outOfStock', () => {
    const s = catalogStats(PRODUCTS);
    expect(s.total).toBe(4);
    expect(s.active).toBe(2);
    expect(s.draft).toBe(2);
    expect(s.outOfStock).toBe(1);
  });

  it('returns zeros for empty array', () => {
    const s = catalogStats([]);
    expect(s).toEqual({ total: 0, active: 0, draft: 0, outOfStock: 0 });
  });
});

describe('getProductThumb', () => {
  it('returns empty string for no images', () => {
    expect(getProductThumb({})).toBe('');
  });

  it('returns string URL directly', () => {
    expect(getProductThumb({ images: ['http://example.com/a.jpg'] })).toBe('http://example.com/a.jpg');
  });

  it('extracts .url from object image', () => {
    expect(getProductThumb({ images: [{ url: 'http://minio/img.jpg' }] })).toBe('http://minio/img.jpg');
  });
});

describe('formatPrice', () => {
  it('reads top-level price', () => {
    expect(formatPrice({ price: 99 })).toBe(99);
  });

  it('reads pricing.retailPrice as fallback', () => {
    expect(formatPrice({ pricing: { retailPrice: 150 } })).toBe(150);
  });

  it('returns null when no price', () => {
    expect(formatPrice({})).toBeNull();
  });
});

describe('formatMargin', () => {
  it('reads an explicit percentage margin', () => {
    expect(formatMargin({ pricing: { marginPct: 42 } })).toBe(42);
  });

  it('converts the canonical dollar margin to a percentage', () => {
    expect(formatMargin({ pricing: { retailPrice: 200, margin: 50 } })).toBe(25);
  });

  it('returns null when no margin', () => {
    expect(formatMargin({})).toBeNull();
  });
});
