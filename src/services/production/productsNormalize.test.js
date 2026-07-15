import { describe, expect, it } from 'vitest';
import {
  inferProductType,
  legacyGemstoneIds,
  normalizeProduct,
} from '@/services/production/productsNormalize';

describe('inferProductType', () => {
  it('maps live-mint prefixes to canonical types', () => {
    expect(inferProductType('gem_lm3f_ab12cd')).toBe('gemstone');
    expect(inferProductType('jwl_lm3f_ab12cd')).toBe('jewelry');
    expect(inferProductType('concept_lm3f_ab12cd')).toBe('jewelry');
  });

  it('falls back to jewelry for unknown / missing prefixes (contract §2.1)', () => {
    expect(inferProductType('efd-halo-ring-001')).toBe('jewelry');
    expect(inferProductType('')).toBe('jewelry');
    expect(inferProductType(null)).toBe('jewelry');
    expect(inferProductType(undefined)).toBe('jewelry');
  });
});

describe('legacyGemstoneIds', () => {
  it('returns a de-duped list of non-empty string ids, or empty', () => {
    expect(legacyGemstoneIds({ references: { gemstoneIds: ['a', 'b', 'a', '', ' c ', 3] } }))
      .toEqual(['a', 'b', 'c']);
    expect(legacyGemstoneIds({ references: {} })).toEqual([]);
    expect(legacyGemstoneIds({})).toEqual([]);
    expect(legacyGemstoneIds({ references: { gemstoneIds: null } })).toEqual([]);
  });
});

describe('normalizeProduct', () => {
  it('legacy jewelry doc: infers productType, singular gemstoneId, and default status', () => {
    const doc = {
      productId: 'jwl_abc_123',
      references: { gemstoneIds: ['stone-1', 'stone-2'] },
    };
    const { patch, skipped } = normalizeProduct(doc);
    expect(patch).toEqual({
      productType: 'jewelry',
      'references.gemstoneId': 'stone-1',
      status: 'draft',
    });
    expect(skipped).toEqual([]);
  });

  it('gemstone product does NOT get a references.gemstoneId (a stone is not cut from itself)', () => {
    const doc = {
      productId: 'gem_abc_123',
      references: { gemstoneIds: ['stone-999'] }, // legacy write-through, ignored here
      status: 'active',
    };
    const { patch } = normalizeProduct(doc);
    expect(patch.productType).toBe('gemstone');
    expect(patch).not.toHaveProperty('references.gemstoneId');
    expect(patch).not.toHaveProperty('status');
  });

  it('is idempotent — a normalized doc yields an empty patch', () => {
    const doc = {
      productId: 'jwl_abc_123',
      productType: 'jewelry',
      status: 'published',
      references: { gemstoneId: 'stone-1', gemstoneIds: ['stone-1'] },
    };
    expect(normalizeProduct(doc).patch).toEqual({});
  });

  it('replaces a retired productType with the canonical inferred type', () => {
    const doc = { productId: 'jwl_abc_123', productType: 'concept', status: 'draft' };
    expect(normalizeProduct(doc).patch).toEqual({ productType: 'jewelry' });
  });

  it('respects a legacy visibility signal (isPublic) as an alternative to status (§1)', () => {
    const doc = { productId: 'jwl_a_1', productType: 'jewelry', isPublic: true };
    expect(normalizeProduct(doc).patch).toEqual({});
  });

  it('leaves runSize untouched (§5.3 absent ≡ unlimited)', () => {
    const doc = { productId: 'jwl_a_1' };
    const { patch } = normalizeProduct(doc);
    expect(patch).not.toHaveProperty('runSize');
  });

  it('never fabricates a productId — surfaces it as a skip instead', () => {
    const doc = { productType: 'jewelry', status: 'published' };
    const { patch, skipped } = normalizeProduct(doc);
    expect(patch).not.toHaveProperty('productId');
    expect(skipped.some((s) => /productId/.test(s))).toBe(true);
  });

  it('empty legacy gemstoneIds → no singular field written', () => {
    const doc = { productId: 'jwl_a_1', references: { gemstoneIds: [] } };
    const { patch } = normalizeProduct(doc);
    expect(patch).not.toHaveProperty('references.gemstoneId');
  });

  it('does not overwrite an already-populated singular references.gemstoneId', () => {
    const doc = {
      productId: 'jwl_a_1',
      productType: 'jewelry',
      status: 'draft',
      references: { gemstoneId: 'keeper', gemstoneIds: ['other'] },
    };
    expect(normalizeProduct(doc).patch).toEqual({});
  });
});
