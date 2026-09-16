import { describe, it, expect } from 'vitest';
import {
  editorVariant, editorPiece, metalsOf, isMadeToOrder, toEditorShape, applyEditorPatch,
} from './jewelryListingEditor';

const design = (over = {}) => ({
  designID: 'd1',
  name: 'Tracks Band',
  description: 'A band.',
  internalNotes: 'consigned row 12',
  category: 'ring',
  vendor: 'Rob Cowden',
  primaryArtisanId: 'user-1cad9d3b',
  attributes: { classification: 'signature', canBeSized: true, sizingRangeUp: '2' },
  edition: { type: 'one_of_one', allocated: 1, committed: 0, nextNumber: 2 },
  defaultVariantId: 'v1',
  variants: [{ variantId: 'v1', active: true, label: 'Tracks Band' }],
  listing: { published: true, visible: true, handle: 'jwl_abc' },
  media: { images: [{ url: 'https://cdn/x.jpg' }] },
  ...over,
});

const piece = (over = {}) => ({
  pieceID: 'p1',
  designID: 'd1',
  status: 'available',
  metalType: 'yellow-gold',
  karat: '14k',
  finish: 'polished',
  weight: 4.2,
  ringSize: '7',
  dimensions: '6mm wide',
  pricing: { retailPrice: 1200, compareAtPrice: null, costBasis: 300 },
  ...over,
});

describe('metalsOf', () => {
  it('reads the primary metal off the piece\'s canonical fields', () => {
    expect(metalsOf(piece())).toEqual([
      { type: 'yellow-gold', color: 'polished', purity: '14k', weight: 4.2 },
    ]);
  });

  it('keeps a two-tone piece whole without storing the primary twice', () => {
    const metals = metalsOf(piece({ metals: [{ type: 'platinum', purity: '950', color: '', weight: 1 }] }));
    expect(metals).toHaveLength(2);
    expect(metals[0].type).toBe('yellow-gold');
    expect(metals[1].type).toBe('platinum');
  });

  it('returns nothing for a piece whose metal is still unrecorded', () => {
    expect(metalsOf(piece({ metalType: null, karat: null, finish: null }))).toEqual([]);
    expect(metalsOf(null)).toEqual([]);
  });
});

describe('isMadeToOrder', () => {
  it('reads the edition, not a flag: a spent one-of-one cannot be made again', () => {
    expect(isMadeToOrder(design())).toBe(false);
    expect(isMadeToOrder(design({ edition: { type: 'unlimited' } }))).toBe(true);
    // No edition at all is the conservative reading: one of one.
    expect(isMadeToOrder({})).toBe(false);
  });
});

describe('editorVariant / editorPiece', () => {
  it('picks the default active variant and the available piece', () => {
    expect(editorVariant(design()).variantId).toBe('v1');
    expect(editorPiece([piece({ pieceID: 'sold', status: 'sold' }), piece()]).pieceID).toBe('p1');
    expect(editorPiece([])).toBeNull();
  });
});

describe('toEditorShape', () => {
  it('produces the nested shape the editor hook already reads', () => {
    const j = toEditorShape({ design: design(), piece: piece() });
    expect(j).toMatchObject({
      productId: 'jwl_abc',
      designID: 'd1',
      pieceID: 'p1',
      title: 'Tracks Band',
      notes: 'consigned row 12',
      status: 'active',
      availability: 'ready-to-ship',
      classification: 'signature',
      vendor: 'Rob Cowden',
      price: 1200,
    });
    expect(j.jewelry).toMatchObject({
      type: 'ring',
      madeToOrder: false,
      material: 'yellow-gold',
      purity: '14k',
      metalColor: 'polished',
      ringSize: '7',
      canBeSized: true,
      sizingRangeUp: '2',
      dimensions: '6mm wide',
    });
    expect(j.images).toEqual([{ url: 'https://cdn/x.jpg' }]);
  });

  it('derives repairItem from the live metal facts rather than storing a copy', () => {
    const j = toEditorShape({ design: design(), piece: piece() });
    expect(j.repairItem).toMatchObject({
      metalType: 'gold', karat: '14k', goldColor: 'yellow', ringSize: '7', canBeSized: true,
    });
  });

  it('falls back through handle → primaryProductId → designID so existing links resolve', () => {
    expect(toEditorShape({ design: design({ listing: {}, primaryProductId: 'jwl_old' }) }).productId).toBe('jwl_old');
    expect(toEditorShape({ design: design({ listing: {}, productID: 'jwl_legacy' }) }).productId).toBe('jwl_legacy');
    expect(toEditorShape({ design: design({ listing: {} }) }).productId).toBe('d1');
  });

  it('prices a design with no piece from the variant, then the design estimate', () => {
    const fromVariant = toEditorShape({
      design: design({ variants: [{ variantId: 'v1', active: true, pricing: { retailPrice: 880 } }] }),
    });
    expect(fromVariant.price).toBe(880);
    expect(toEditorShape({ design: design({ suggestedRetail: 220 }) }).price).toBe(220);
  });

  it('reports draft when the design is not published', () => {
    expect(toEditorShape({ design: design({ listing: { published: false } }) }).status).toBe('draft');
  });
});

describe('applyEditorPatch', () => {
  it('splits as-built facts onto the piece and offering facts onto the design', () => {
    const { designSet, pieceSet } = applyEditorPatch({
      design: design(),
      piece: piece(),
      data: {
        title: 'Tracks Band II', type: 'ring', canBeSized: false, chainIncluded: true,
        metals: [{ type: 'platinum', purity: '950', color: 'white', weight: 6 }],
        ringSize: '8', price: '1400',
      },
    });
    expect(designSet.name).toBe('Tracks Band II');
    expect(designSet.category).toBe('ring');
    expect(designSet['attributes.canBeSized']).toBe(false);
    expect(designSet['attributes.chainIncluded']).toBe(true);

    expect(pieceSet.metalType).toBe('platinum');
    expect(pieceSet.karat).toBe('950');
    expect(pieceSet.finish).toBe('white');
    expect(pieceSet.weight).toBe(6);
    expect(pieceSet.ringSize).toBe('8');
    expect(pieceSet['pricing.retailPrice']).toBe(1400);
    // The metal a piece is actually in is not a fact about the design.
    expect(Object.keys(designSet).some((k) => k.includes('metal') || k.includes('ringSize'))).toBe(false);
  });

  it('writes dotted paths only, never a whole subdocument', () => {
    // A `attributes: {...}` or `pricing: {...}` assignment would delete every key the form did
    // not send — the recurring data-loss shape in this codebase.
    const { designSet, pieceSet } = applyEditorPatch({
      design: design(), piece: piece(), data: { canBeSized: true, price: '10' },
    });
    for (const k of [...Object.keys(designSet), ...Object.keys(pieceSet)]) {
      expect(['attributes', 'pricing', 'listing', 'production', 'edition', 'media', 'viewer', 'files']).not.toContain(k);
    }
  });

  it('only touches fields the form actually sent', () => {
    const { designSet, pieceSet } = applyEditorPatch({ design: design(), piece: piece(), data: { ringSize: '9' } });
    expect(designSet).toEqual({});
    expect(Object.keys(pieceSet)).toEqual(['ringSize']);
  });

  it('never rewrites the edition counters when made-to-order is toggled', () => {
    // Rewriting allocated/committed re-opens capacity on a one-of-one that has already been
    // made and sold — the oversell shape. Only the type is the editor's to set.
    const { designSet } = applyEditorPatch({
      design: design(), piece: piece(), data: { madeToOrder: true },
    });
    expect(designSet['edition.type']).toBe('unlimited');
    expect(Object.keys(designSet).filter((k) => k.startsWith('edition.'))).toEqual(['edition.type']);

    // Unchanged state writes nothing at all.
    const same = applyEditorPatch({ design: design(), piece: piece(), data: { madeToOrder: false } });
    expect(same.designSet['edition.type']).toBeUndefined();
  });

  it('accepts made-to-order expressed as the availability dropdown', () => {
    const { designSet } = applyEditorPatch({
      design: design(), piece: piece(), data: { availability: 'made-to-order' },
    });
    expect(designSet['edition.type']).toBe('unlimited');
  });

  it('maps status onto the listing block the storefront reads', () => {
    const { designSet } = applyEditorPatch({
      design: design({ listing: {}, primaryProductId: 'jwl_old' }),
      piece: piece(),
      data: { status: 'active' },
      actor: 'u1',
    });
    expect(designSet['listing.published']).toBe(true);
    expect(designSet['listing.handle']).toBe('jwl_old');
    expect(designSet['listing.listedBy']).toBe('u1');
  });

  it('sends the GLB to the field the shop viewer reads, not a jewelry blob', () => {
    const { designSet } = applyEditorPatch({
      design: design(), piece: piece(), data: { glbFile: 'https://cdn/ring.glb', stlFile: 'https://cdn/ring.stl' },
    });
    expect(designSet['viewer.glbUrl']).toBe('https://cdn/ring.glb');
    expect(designSet['files.stl']).toBe('https://cdn/ring.stl');
  });

  it('warns instead of silently dropping the metal and price when there is no piece', () => {
    const { designSet, pieceSet, warnings } = applyEditorPatch({
      design: design(), piece: null, data: { title: 'Still saves', ringSize: '7', price: '900' },
    });
    expect(designSet.name).toBe('Still saves');
    expect(pieceSet).toEqual({});
    expect(warnings[0]).toMatch(/no piece/i);
  });

  it('ignores a blank title rather than erasing the design name', () => {
    const { designSet } = applyEditorPatch({ design: design(), piece: piece(), data: { title: '  ' } });
    expect(designSet.name).toBeUndefined();
  });
});
