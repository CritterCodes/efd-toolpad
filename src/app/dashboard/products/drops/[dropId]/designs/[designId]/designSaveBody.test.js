import { describe, it, expect } from 'vitest';
import { designFormProblem, buildDesignSaveBody } from './designSaveBody';

/** The design editor's save, now testable outside the page (moved out of DesignDetail for max-lines). */
const variant = (over = {}) => ({
  variantId: 'v1', sku: 'R-1', label: '', active: true, finish: 'gold', karat: '14', ringSize: '7',
  sizingMin: '', sizingMax: '', retailPrice: '', leadTimeDays: '', gemstones: [], markupOverride: '', ...over,
});
const form = (over = {}) => ({
  name: 'Halo', description: '', category: 'ring', productionMethod: 'cad_cast', status: 'draft', tags: [],
  primaryArtisanId: 'u-1', editionType: 'open', editionLimit: '', gemCut: '', gemCutStyle: '',
  pricing: { markup: '', laborTasks: [], shipping: [], designFee: { mode: 'flat', amount: '' } },
  variants: [variant()], ...over,
});

describe('designFormProblem', () => {
  it('accepts a complete form', () => {
    expect(designFormProblem(form())).toBeNull();
  });
  it('names the first problem, in the order the editor always checked them', () => {
    expect(designFormProblem(form({ name: '  ' }))).toBe('Name is required.');
    expect(designFormProblem(form({ primaryArtisanId: '' }))).toBe('A primary artisan is required.');
    expect(designFormProblem(form({ variants: [variant({ sku: ' ' })] }))).toBe('Every variant needs a SKU.');
    expect(designFormProblem(form({ variants: [variant({ ringSize: '' })] }))).toBe('Ring variants need a nominal ring size.');
    expect(designFormProblem(form({ variants: [variant(), variant({ variantId: 'v2' })] }))).toBe('Variant SKUs must be unique.');
  });
});

describe('buildDesignSaveBody', () => {
  it('trims, nulls the empties and composes the metal key', () => {
    const body = buildDesignSaveBody(form({ name: ' Halo ', editionType: 'limited', editionLimit: '5' }), { design: { variants: [] }, stoneCosts: {} });
    expect(body).toMatchObject({ name: 'Halo', description: null, edition: { type: 'limited', limit: 5 } });
    expect(body.variants[0]).toMatchObject({ sku: 'R-1', karat: '14', ringSize: '7', leadTimeDays: null, stonesCost: 0 });
    expect(body.variants[0].metalKey).toBeTruthy();
    expect(body.gemstone).toBeUndefined();
  });

  it('keeps a gem rate stamp unless the rates changed', () => {
    const colors = [{ label: 'Blue', rates: [{ upToCt: 1, ratePerCarat: 100 }] }];
    const design = { variants: [{ variantId: 'v1', gemstone: { colors, ratesUpdatedAt: '2026-09-01T00:00:00.000Z' } }] };
    const gemForm = form({ category: 'gemstone', variants: [variant({ ringSize: '', gem: { species: 'Sapphire', colors } })] });
    expect(buildDesignSaveBody(gemForm, { design, stoneCosts: {} }).variants[0].gemstone.ratesUpdatedAt).toBe('2026-09-01T00:00:00.000Z');
    const changed = form({ category: 'gemstone', variants: [variant({ ringSize: '', gem: { species: 'Sapphire', colors: [{ label: 'Blue', rates: [{ upToCt: 1, ratePerCarat: 120 }] }] } })] });
    expect(buildDesignSaveBody(changed, { design, stoneCosts: {} }).variants[0].gemstone.ratesUpdatedAt).not.toBe('2026-09-01T00:00:00.000Z');
  });
});
