import { describe, expect, it } from 'vitest';
import { validateProductContract, buildProductFromPiece, buildProductFromDesign, attachPieceToProduct, suggestedRetailFromCOGS, normalizeRunSize } from '@/services/products/productContract';

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

  it('threads an explicit runSize and derives remaining from the backing piece', () => {
    const piece = { pieceID: 'p1', totalCOGS: 100, status: 'available' };
    const product = buildProductFromPiece({ piece, opts: { runSize: { type: 'limited', size: 10 } } });
    expect(product.runSize).toEqual({ type: 'limited', size: 10, remaining: 9 }); // 1 produced
    expect(product.availability).toBe('ready-to-ship');
  });

  it('unlimited runSize → made-to-order even when a piece is available', () => {
    const piece = { pieceID: 'p2', totalCOGS: 0, status: 'available' };
    const product = buildProductFromPiece({ piece, opts: { runSize: { type: 'unlimited' } } });
    expect(product.runSize).toEqual({ type: 'unlimited' });
    expect(product.availability).toBe('made-to-order');
  });

  it('omits runSize and keeps legacy availability when none is given', () => {
    const product = buildProductFromPiece({ piece: { pieceID: 'p3', totalCOGS: 0, status: 'available' } });
    expect(product.runSize).toBeUndefined();
    expect(product.availability).toBe('ready-to-ship');
  });

  it('honors an explicit canonical productType', () => {
    const product = buildProductFromPiece({ piece: { pieceID: 'p4', totalCOGS: 0 }, opts: { productType: 'jewelry' } });
    expect(product.productType).toBe('jewelry');
  });

  it('threads references.gemstoneId from the piece (flywheel; M1-T2)', () => {
    const product = buildProductFromPiece({ piece: { pieceID: 'p1', gemstoneId: 'gem-123', totalCOGS: 0 } });
    expect(product.references.gemstoneId).toBe('gem-123');
  });

  it('falls back to the design gemstoneId when the piece has none', () => {
    const product = buildProductFromPiece({ piece: { pieceID: 'p2', totalCOGS: 0 }, design: { gemstoneId: 'gem-9' } });
    expect(product.references.gemstoneId).toBe('gem-9');
  });

  it('references.gemstoneId is null when neither piece nor design carry one', () => {
    const product = buildProductFromPiece({ piece: { pieceID: 'p3', totalCOGS: 0 } });
    expect(product.references.gemstoneId).toBeNull();
  });
});

describe('buildProductFromDesign', () => {
  const design = { designID: 'd1', name: 'Nebula Pendant', gemstoneId: 'gem-7', metalOptions: ['14k_yellow'] };

  it('builds a made-to-order jewelry product priced off the estimate', () => {
    const p = buildProductFromDesign({ design, estCost: 120 });
    expect(p.productType).toBe('jewelry');
    expect(p.availability).toBe('made-to-order');
    expect(p.status).toBe('draft');
    expect(p.pricing.costBasis).toBe(120);
    expect(p.pricing.costBasisSource).toBe('estimated');
    expect(p.pricing.retailPrice).toBe(suggestedRetailFromCOGS(120));
    expect(p.references.designId).toBe('d1');
    expect(p.references.gemstoneId).toBe('gem-7');
    expect(p.references.pieceID).toBeNull();
    expect(p.pieceIDs).toEqual([]);
  });

  it('prefers the design suggestedRetail when set', () => {
    const p = buildProductFromDesign({ design: { ...design, suggestedRetail: 499 }, estCost: 120 });
    expect(p.pricing.retailPrice).toBe(499);
  });

  it('honors an explicit runSize (limited edition, 0 produced)', () => {
    const p = buildProductFromDesign({ design, estCost: 100, opts: { runSize: { type: 'limited', size: 8 } } });
    expect(p.runSize).toEqual({ type: 'limited', size: 8, remaining: 8 });
  });

  it('stamps a top-level designId (what publish/validate/the shop resolvers read)', () => {
    const p = buildProductFromDesign({ design, estCost: 100 });
    expect(p.designId).toBe('d1');
  });

  describe('gemstone design branch', () => {
    const gemDesign = {
      designID: 'gd1', name: 'Aster Cut', category: 'gemstone',
      pricing: { markup: 2 },
      gemstone: { cut: ['cushion'], cutStyle: ['brilliant'] },
      designModel: { glbUrl: 'https://cdn/aster.glb', generatedFromStl: true },
      primaryArtisanId: 'cutter-1',
      variants: [{
        variantId: 'v1', sku: 'AST-1', active: true,
        gemstone: {
          species: 'Amethyst', availability: 'purchase', caratMin: 1, caratMax: 4,
          cutLaborCost: 60, yield: 0.25,
          colors: [{ label: 'deep purple', rates: [{ upToCt: 4, ratePerCarat: 50 }] }],
        },
      }],
    };
    const seller = { userId: 'cutter-1', displayName: 'Aster Gems', artisanType: 'Gem Cutter' };

    it('gemstone listing: from-price floor, public spec, no rate table', () => {
      const p = buildProductFromDesign({ design: gemDesign, estCost: 0, opts: { seller, gemPricing: { defaultMarkup: 2.5, sharedCosts: 40 } } });
      expect(p.productType).toBe('gemstone');
      expect(p.listingType).toBe('gemstone');
      // (1/0.25 × 50 + 60 + 40) × 2 = 600
      expect(p.pricing.retailPrice).toBeCloseTo(600, 2);
      expect(p.pricing.priceIsFrom).toBe(true);
      expect(p.gemstone.species).toBe('Amethyst');
      expect(p.gemstone.colors).toEqual(['deep purple']);
      expect(p.gemstone.availability).toBeUndefined();
      expect(JSON.stringify(p)).not.toContain('ratePerCarat');
      expect(JSON.stringify(p)).not.toContain('cutLaborCost');
    });

    it('stamps ownership from the seller so the cutter can publish + upload certs', () => {
      const p = buildProductFromDesign({ design: gemDesign, estCost: 0, opts: { seller } });
      expect(p.userId).toBe('cutter-1');
      expect(p.vendor).toBe('Aster Gems');
      expect(p.seller).toEqual(seller);
    });

    it('projects a viewer from the design GLB with a species-mapped gem preset', () => {
      const p = buildProductFromDesign({ design: gemDesign, estCost: 0, opts: {} });
      expect(p.viewer.glbUrl).toBe('https://cdn/aster.glb');
      expect(p.viewer.meshMap).toEqual([{ nameContains: '', type: 'gem', gemPreset: 'amethyst' }]);
      // Unknown species falls back to diamond; explicit opts.viewer (incl. null) wins.
      const odd = structuredClone(gemDesign);
      odd.variants[0].gemstone.species = 'Unobtanium';
      expect(buildProductFromDesign({ design: odd, estCost: 0, opts: {} }).viewer.meshMap[0].gemPreset).toBe('diamond');
      expect(buildProductFromDesign({ design: gemDesign, estCost: 0, opts: { viewer: null } }).viewer).toBeNull();
    });

    it('a gem listing passes the product contract (publishable once priced + imaged)', () => {
      const p = buildProductFromDesign({ design: gemDesign, estCost: 0, opts: { seller, gemPricing: {} } });
      const check = validateProductContract(p);
      expect(check.valid).toBe(true);
    });
  });
});

describe('attachPieceToProduct', () => {
  const product = {
    productId: 'x', productType: 'jewelry',
    pricing: { retailPrice: 300, costBasis: 120, costBasisSource: 'estimated' },
    runSize: { type: 'limited', size: 5, remaining: 5 },
    pieceIDs: [], references: { designId: 'd1', pieceID: null, gemstoneId: 'gem-7' },
  };

  it('attaches actual COGS, margin, and recomputed remaining', () => {
    const patch = attachPieceToProduct({ product, piece: { pieceID: 'p1', totalCOGS: 140, status: 'available' } });
    expect(patch.productType).toBe('jewelry');
    expect(patch['pricing.costBasis']).toBe(140);
    expect(patch['pricing.costBasisSource']).toBe('actual');
    expect(patch['pricing.margin']).toBe(160); // 300 − 140
    expect(patch['references.pieceID']).toBe('p1');
    expect(patch.pieceIDs).toEqual(['p1']);
    expect(patch.runSize).toEqual({ type: 'limited', size: 5, remaining: 4 }); // 1 produced
    expect(patch.availability).toBe('ready-to-ship');
  });

  it('unlimited product remains made-to-order', () => {
    const patch = attachPieceToProduct({ product: { ...product, runSize: { type: 'unlimited' } }, piece: { pieceID: 'p2', totalCOGS: 100, status: 'available' } });
    expect(patch.availability).toBe('made-to-order');
    expect(patch.runSize).toEqual({ type: 'unlimited' });
  });
});

describe('normalizeRunSize', () => {
  it('limited: remaining = size − produced (acceptance: 10 − 3 = 7)', () => {
    expect(normalizeRunSize({ type: 'limited', size: 10 }, 3)).toEqual({ type: 'limited', size: 10, remaining: 7 });
  });

  it('limited: remaining floors at 0 when over-produced', () => {
    expect(normalizeRunSize({ type: 'limited', size: 5 }, 8)).toEqual({ type: 'limited', size: 5, remaining: 0 });
  });

  it('one_of_one: size 1, remaining reflects production', () => {
    expect(normalizeRunSize({ type: 'one_of_one' }, 0)).toEqual({ type: 'one_of_one', size: 1, remaining: 1 });
    expect(normalizeRunSize({ type: 'one_of_one' }, 1)).toEqual({ type: 'one_of_one', size: 1, remaining: 0 });
  });

  it('unlimited / absent / limited-without-size → uncapped unlimited', () => {
    expect(normalizeRunSize({ type: 'unlimited' })).toEqual({ type: 'unlimited' });
    expect(normalizeRunSize(null)).toEqual({ type: 'unlimited' });
    expect(normalizeRunSize({ type: 'limited' })).toEqual({ type: 'unlimited' });
  });
});
