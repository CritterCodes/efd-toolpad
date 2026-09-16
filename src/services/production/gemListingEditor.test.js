import { describe, it, expect } from 'vitest';
import { editorVariant, editorPiece, toEditorShape, applyEditorPatch } from './gemListingEditor';

const design = (over = {}) => ({
  designID: 'd1',
  name: 'Tanzanian Tourmaline Shield',
  description: 'A shield cut.',
  category: 'gemstone',
  gemstone: { cut: ['shield'], cutStyle: ['step'] },
  defaultVariantId: 'v1',
  variants: [{
    variantId: 'v1',
    active: true,
    gemstone: { species: 'Tourmaline', subspecies: 'Chrome', naturalSynthetic: 'natural' },
  }],
  listing: { published: true, visible: true, handle: 'gem_abc' },
  ...over,
});

const piece = (over = {}) => ({
  pieceID: 'p1',
  designID: 'd1',
  status: 'available',
  gemstone: {
    species: 'Tourmaline',
    carat: 3.12,
    dimensions: '9.1 x 7.4 x 5.0',
    color: ['green'],
    clarity: 'VS',
    treatment: ['heat'],
    locale: 'Tanzania',
    acquisitionPrice: 400,
    supplier: 'Jacob West',
  },
  pricing: { retailPrice: 1200, compareAtPrice: 1500 },
  ...over,
});

describe('editorVariant / editorPiece', () => {
  it('prefers the default active variant, then any active one', () => {
    expect(editorVariant(design()).variantId).toBe('v1');
    const d = design({
      defaultVariantId: 'gone',
      variants: [{ variantId: 'v0', active: false }, { variantId: 'v2', active: true }],
    });
    expect(editorVariant(d).variantId).toBe('v2');
  });

  it('prefers an available piece but still edits a sold one rather than nothing', () => {
    expect(editorPiece([piece({ pieceID: 'sold', status: 'sold' }), piece()]).pieceID).toBe('p1');
    expect(editorPiece([piece({ pieceID: 'sold', status: 'sold' })]).pieceID).toBe('sold');
    // A scrapped stone is the last resort, never chosen over a live one.
    expect(editorPiece([piece({ pieceID: 'x', status: 'scrapped' }), piece({ pieceID: 'y', status: 'sold' })]).pieceID).toBe('y');
    expect(editorPiece([])).toBeNull();
  });
});

describe('toEditorShape', () => {
  it('flattens design + piece into the shape the form already consumes', () => {
    const g = toEditorShape({ design: design(), piece: piece() });
    expect(g).toMatchObject({
      productId: 'gem_abc',
      designID: 'd1',
      pieceID: 'p1',
      title: 'Tanzanian Tourmaline Shield',
      species: 'Tourmaline',
      subspecies: 'Chrome',
      cut: 'shield',
      cutStyle: 'step',
      carat: 3.12,
      clarity: 'VS',
      treatment: 'heat',
      status: 'active',
    });
    expect(g.pricing).toEqual({ retailPrice: 1200, compareAtPrice: 1500, costBasis: 400 });
  });

  it('falls back through handle → primaryProductId → designID so existing links keep resolving', () => {
    expect(toEditorShape({ design: design({ listing: {} , primaryProductId: 'prod_9' }) }).productId).toBe('prod_9');
    expect(toEditorShape({ design: design({ listing: {}, primaryProductId: null }) }).productId).toBe('d1');
  });

  it('renders a structured dimensions object as the single line the form shows', () => {
    const g = toEditorShape({
      design: design(),
      piece: piece({ gemstone: { dimensions: { length: 9.1, width: 7.4, height: 5 } } }),
    });
    expect(g.dimensions).toBe('9.1 × 7.4 × 5');
  });

  it('reports draft when the design is not published — that flag IS the publish state', () => {
    expect(toEditorShape({ design: design({ listing: { published: false } }) }).status).toBe('draft');
  });
});

describe('applyEditorPatch', () => {
  it('splits as-built facts onto the piece and offering facts onto the design', () => {
    const { designSet, pieceSet } = applyEditorPatch({
      design: design(),
      piece: piece(),
      data: { title: 'New Name', cut: 'shield, kite', species: 'Spinel', carat: '2.5', clarity: 'VVS', price: '900' },
    });
    expect(designSet.name).toBe('New Name');
    expect(designSet['gemstone.cut']).toEqual(['shield', 'kite']);
    expect(designSet['variants.$[v].gemstone.species']).toBe('Spinel');
    expect(pieceSet['gemstone.carat']).toBe(2.5);
    expect(pieceSet['gemstone.clarity']).toBe('VVS');
    expect(pieceSet['pricing.retailPrice']).toBe(900);
    // The carat and the price are NOT design facts — two stones of one cut differ here.
    expect(Object.keys(designSet).some((k) => k.includes('carat') || k.includes('pricing'))).toBe(false);
  });

  it('writes dotted paths only, never a whole subdocument', () => {
    // A `gemstone: {...}` assignment would delete every key the form did not send. That is the
    // recurring data-loss shape in this codebase; the guard belongs in a test.
    const { designSet, pieceSet } = applyEditorPatch({
      design: design(), piece: piece(), data: { carat: '1.1', species: 'Spinel' },
    });
    for (const k of [...Object.keys(designSet), ...Object.keys(pieceSet)]) {
      expect(['gemstone', 'pricing', 'listing', 'variants']).not.toContain(k);
    }
  });

  it('only touches fields the form actually sent', () => {
    const { designSet, pieceSet } = applyEditorPatch({ design: design(), piece: piece(), data: { carat: '4' } });
    expect(designSet).toEqual({});
    expect(Object.keys(pieceSet)).toEqual(['gemstone.carat']);
  });

  it('maps status onto the listing block the storefront reads, and seeds a handle on publish', () => {
    const { designSet } = applyEditorPatch({
      design: design({ listing: {}, primaryProductId: 'prod_9' }),
      piece: piece(),
      data: { status: 'active' },
      actor: 'u1',
    });
    expect(designSet['listing.published']).toBe(true);
    expect(designSet['listing.visible']).toBe(true);
    expect(designSet['listing.handle']).toBe('prod_9');
    expect(designSet['listing.listedBy']).toBe('u1');

    const draft = applyEditorPatch({ design: design(), piece: piece(), data: { status: 'draft' } });
    expect(draft.designSet['listing.published']).toBe(false);
    expect(draft.designSet['listing.visible']).toBe(false);
  });

  it('keeps the species on the piece in step with the variant, since the shop merges them', () => {
    const { designSet, pieceSet } = applyEditorPatch({
      design: design(), piece: piece(), data: { species: 'Spinel' },
    });
    expect(designSet['variants.$[v].gemstone.species']).toBe('Spinel');
    expect(pieceSet['gemstone.species']).toBe('Spinel');
  });

  it('warns instead of silently dropping the stone facts when there is no piece', () => {
    const { pieceSet, warnings } = applyEditorPatch({
      design: design(), piece: null, data: { carat: '3', title: 'Still saves' },
    });
    expect(pieceSet).toEqual({});
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/no piece/i);
  });

  it('warns when a design has no variant to hold the species', () => {
    const { warnings } = applyEditorPatch({
      design: design({ variants: [] }), piece: piece(), data: { species: 'Spinel' },
    });
    expect(warnings[0]).toMatch(/no variant/i);
  });

  it('blanks a cleared number rather than storing 0 or NaN', () => {
    const { pieceSet } = applyEditorPatch({
      design: design(), piece: piece(), data: { carat: '', compareAtPrice: '' },
    });
    expect(pieceSet['gemstone.carat']).toBeNull();
    expect(pieceSet['pricing.compareAtPrice']).toBeNull();
  });

  it('ignores a blank title rather than erasing the design name', () => {
    const { designSet } = applyEditorPatch({ design: design(), piece: piece(), data: { title: '   ' } });
    expect(designSet.name).toBeUndefined();
  });
});
