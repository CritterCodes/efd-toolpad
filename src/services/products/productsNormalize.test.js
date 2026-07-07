import { describe, expect, it } from 'vitest';
import { inferProductType, mintProductId, computeProductNormalizePatch } from '@/services/products/productsNormalize';

describe('inferProductType (C-5 §5.1)', () => {
  it('keeps a valid existing productType', () => {
    expect(inferProductType({ productType: 'concept' })).toBe('concept');
  });
  it('infers from the productId prefix', () => {
    expect(inferProductType({ productId: 'gem_abc' })).toBe('gemstone');
    expect(inferProductType({ productId: 'jwl_abc' })).toBe('jewelry');
    expect(inferProductType({ productId: 'cpt_abc' })).toBe('concept');
  });
  it('defaults to jewelry when neither present nor inferable', () => {
    expect(inferProductType({})).toBe('jewelry');
    expect(inferProductType({ productId: 'weird-id' })).toBe('jewelry');
    expect(inferProductType({ productType: 'widget' })).toBe('jewelry');
  });
});

describe('mintProductId', () => {
  it('is type-prefixed and URL-safe', () => {
    expect(mintProductId('gemstone', 'Blue Sapphire')).toMatch(/^gem_blue-sapphire_[a-z0-9]+$/);
    expect(mintProductId('jewelry')).toMatch(/^jwl_[a-z0-9]+$/);
  });
});

describe('computeProductNormalizePatch (idempotent, additive)', () => {
  it('returns an empty patch for an already-conformant doc (→ no-op / re-run safe)', () => {
    const doc = { productId: 'gem_ok', productType: 'gemstone', status: 'published', references: { gemstoneId: 'g1', gemstoneIds: ['g1'] } };
    expect(computeProductNormalizePatch(doc)).toEqual({ set: {}, changed: [] });
  });

  it('backfills productType from the id prefix', () => {
    const { set, changed } = computeProductNormalizePatch({ productId: 'gem_x', status: 'draft' });
    expect(set.productType).toBe('gemstone');
    expect(changed).toContain('productType');
  });

  it('adopts gemstoneIds[0] → singular references.gemstoneId (D5), array retained (not removed)', () => {
    const { set, changed } = computeProductNormalizePatch({ productId: 'jwl_x', productType: 'jewelry', status: 'draft', references: { gemstoneIds: ['g1', 'g2'] } });
    expect(set['references.gemstoneId']).toBe('g1');
    expect(set).not.toHaveProperty('references.gemstoneIds'); // array untouched → retained
    expect(changed).toEqual(['references.gemstoneId']);
  });

  it('does not overwrite an existing singular gemstoneId', () => {
    const { set } = computeProductNormalizePatch({ productId: 'jwl_x', productType: 'jewelry', status: 'draft', references: { gemstoneId: 'keep', gemstoneIds: ['other'] } });
    expect(set).not.toHaveProperty('references.gemstoneId');
  });

  it('ensures a status when absent (§5.4)', () => {
    const { set, changed } = computeProductNormalizePatch({ productId: 'jwl_x', productType: 'jewelry' });
    expect(set.status).toBe('draft');
    expect(changed).toContain('status');
  });

  it('mints a string productId when absent / non-URL-safe (§5.5)', () => {
    const a = computeProductNormalizePatch({ productType: 'gemstone', status: 'draft', title: 'Ruby' });
    expect(a.set.productId).toMatch(/^gem_ruby_/);
    const b = computeProductNormalizePatch({ productId: 'has spaces', productType: 'jewelry', status: 'draft' });
    expect(b.set.productId).toMatch(/^jwl_/);
  });

  it('never fabricates runSize (§5.3)', () => {
    const { set } = computeProductNormalizePatch({ productId: 'jwl_x', productType: 'jewelry', status: 'draft' });
    expect(set).not.toHaveProperty('runSize');
  });

  it('is idempotent: applying the patch then re-computing yields an empty patch', () => {
    const doc = { title: 'Emerald', references: { gemstoneIds: ['g9'] } };
    const { set } = computeProductNormalizePatch(doc);
    // simulate $set application (incl. dot-path for references.gemstoneId)
    const applied = { ...doc, ...set };
    if (set['references.gemstoneId']) applied.references = { ...doc.references, gemstoneId: set['references.gemstoneId'] };
    expect(computeProductNormalizePatch(applied)).toEqual({ set: {}, changed: [] });
  });
});
