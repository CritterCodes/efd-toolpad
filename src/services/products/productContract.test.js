import { describe, expect, it } from 'vitest';
import { validateProductContract, buildProductFromPiece, suggestedRetailFromCOGS } from '@/services/products/productContract';

describe('validateProductContract', () => {
  const base = { productId: 'efd-ring-001', title: 'Ring', pricing: { retailPrice: 100 }, availability: 'ready-to-ship', images: ['https://x/a.jpg'] };

  it('accepts a valid photos-only product', () => {
    expect(validateProductContract(base).valid).toBe(true);
  });

  it('rejects missing title / bad availability / non-URL-safe id', () => {
    expect(validateProductContract({ ...base, title: '' }).valid).toBe(false);
    expect(validateProductContract({ ...base, availability: 'whenever' }).valid).toBe(false);
    expect(validateProductContract({ ...base, productId: 'has spaces' }).valid).toBe(false);
  });

  it('requires at least one of viewer or images', () => {
    const { images, ...noMedia } = base;
    expect(validateProductContract(noMedia).valid).toBe(false);
  });

  it('validates viewer.meshMap slots', () => {
    const withViewer = (meshMap) => validateProductContract({ ...base, images: undefined, viewer: { glbUrl: 'https://x/m.glb', meshMap } });
    expect(withViewer([{ nameContains: 'Ring', type: 'metal', finish: 'gold' }]).valid).toBe(true);
    expect(withViewer([{ nameContains: 'Ring', type: 'metal', finish: 'titanium' }]).valid).toBe(false);
    expect(withViewer([{ nameContains: 'Gem', type: 'gem', gemPreset: 'unobtanium' }]).valid).toBe(false);
    expect(withViewer([]).valid).toBe(false);
  });
});

describe('buildProductFromPiece', () => {
  it('sets costBasis from piece COGS and suggests retail', () => {
    const piece = { pieceID: 'p1', designID: 'd1', totalCOGS: 200, metalType: 'gold', karat: '14k', status: 'available' };
    const product = buildProductFromPiece({ piece, design: { name: 'Halo Ring' } });
    expect(product.title).toBe('Halo Ring');
    expect(product.pricing.costBasis).toBe(200);
    expect(product.pricing.retailPrice).toBe(suggestedRetailFromCOGS(200));
    expect(product.references.pieceID).toBe('p1');
    expect(product.references.designId).toBe('d1');
    expect(product.availability).toBe('ready-to-ship'); // derived from piece status
    expect(product.status).toBe('draft');
    expect(product.pieceIDs).toEqual(['p1']);
  });

  it('defaults to made-to-order when the piece is not yet available', () => {
    const product = buildProductFromPiece({ piece: { pieceID: 'p2', totalCOGS: 0, status: 'in_finishing' } });
    expect(product.availability).toBe('made-to-order');
  });
});
