import { describe, it, expect } from 'vitest';
import {
  premadeMaterials, resolveVariant, buildPremadePiece, PREMADE_COST_LABEL,
} from './pieceIntake';

const design = (over = {}) => ({
  designID: 'd1',
  name: 'Hammered Band',
  primaryArtisanId: 'user-1',
  defaultVariantId: 'v1',
  variants: [{ variantId: 'v1', active: true, options: { width: '6mm' } }],
  edition: { type: 'one_of_one', allocated: 0, committed: 0, nextNumber: 1 },
  ...over,
});

describe('premadeMaterials', () => {
  it('records the cost as the single material line totalCOGS is derived from', () => {
    expect(premadeMaterials(240)).toEqual([
      { label: PREMADE_COST_LABEL, unitCost: 240, qty: 1, source: 'premade-intake' },
    ]);
  });

  it('records nothing when no cost is known', () => {
    // A consigned piece whose payout settles on sale has no cost yet. A zero line would read as
    // "cost nothing to make", which is a different and false claim.
    expect(premadeMaterials(0)).toEqual([]);
    expect(premadeMaterials(null)).toEqual([]);
    expect(premadeMaterials('')).toEqual([]);
  });
});

describe('resolveVariant', () => {
  it('prefers the asked-for variant, then the default, then any active one', () => {
    const d = design({
      defaultVariantId: 'v2',
      variants: [{ variantId: 'v1', active: true }, { variantId: 'v2', active: true }],
    });
    expect(resolveVariant(d, 'v1').variantId).toBe('v1');
    expect(resolveVariant(d).variantId).toBe('v2');
    expect(resolveVariant(design({ defaultVariantId: null, variants: [{ variantId: 'v9', active: true }] })).variantId).toBe('v9');
  });

  it('returns nothing for a design with no variants at all', () => {
    expect(resolveVariant(design({ variants: [] }))).toBeNull();
  });
});

describe('buildPremadePiece', () => {
  it('creates a piece that is available now and owes nobody labor', () => {
    const piece = buildPremadePiece({
      design: design(),
      editionNumber: 1,
      data: { metalType: 'silver', karat: '925', ringSize: '8', cost: 120, retailPrice: 480 },
      actor: 'user-1',
    });
    expect(piece.status).toBe('available');
    // The defining property of intake: the work was not done here, so no work orders exist.
    expect(piece.workOrderIDs).toEqual([]);
    expect(piece.editionNumber).toBe(1);
    expect(piece.metalType).toBe('silver');
    expect(piece.karat).toBe('925');
    expect(piece.ringSize).toBe('8');
  });

  it('derives COGS from the recorded cost through the same function every piece uses', () => {
    const piece = buildPremadePiece({ design: design(), editionNumber: 1, data: { cost: 120 } });
    expect(piece.accruedMaterialCost).toBe(120);
    // No labor is accrued — inventing it would credit someone for work they did not do here.
    expect(piece.accruedLaborCost).toBe(0);
    expect(piece.totalCOGS).toBe(120);
  });

  it('leaves COGS at zero when no cost is recorded, rather than guessing', () => {
    const piece = buildPremadePiece({ design: design(), editionNumber: 1, data: {} });
    expect(piece.actualMaterials).toEqual([]);
    expect(piece.totalCOGS).toBe(0);
  });

  it('prices the one-off on the piece, which is what the shop reads first', () => {
    const piece = buildPremadePiece({ design: design(), editionNumber: 1, data: { price: '480' } });
    expect(piece.pricing.retailPrice).toBe(480);
    expect(piece.pricing.compareAtPrice).toBeNull();
  });

  it('records how the piece came to exist so it is never mistaken for one we produced', () => {
    const piece = buildPremadePiece({
      design: design(), editionNumber: 2, data: { note: 'consigned, sheet row 4' }, actor: 'admin-1',
    });
    expect(piece.provenance.kind).toBe('premade');
    expect(piece.provenance.madeBy).toBe('user-1');
    expect(piece.provenance.note).toBe('consigned, sheet row 4');
    expect(piece.createdBy).toBe('admin-1');
  });

  it('carries the variant it is an instance of, and its configuration', () => {
    const piece = buildPremadePiece({
      design: design(), editionNumber: 1, data: { variantId: 'v1', metalType: 'gold', karat: '14k' },
    });
    expect(piece.variantId).toBe('v1');
    expect(piece.resolvedConfiguration).toEqual({ width: '6mm', metalType: 'gold', karat: '14k' });
  });

  it('still produces a valid piece for a design that has no variants yet', () => {
    // Pieces require a variantId (catalog contract §7) — a synthetic one keeps a handmade
    // one-off valid without inventing a SKU nobody asked for.
    const piece = buildPremadePiece({ design: design({ variants: [] }), editionNumber: 1, data: {} });
    expect(piece.variantId).toBe('d1::default');
  });

  it('refuses to build a piece the pieces contract would reject', () => {
    expect(() => buildPremadePiece({ design: { designID: null, variants: [] }, editionNumber: 1, data: {} }))
      .toThrow(/designID is required/);
  });

  it('takes explicit materials over a flat cost when the caller itemised them', () => {
    const piece = buildPremadePiece({
      design: design(),
      editionNumber: 1,
      data: { cost: 999, actualMaterials: [{ label: 'silver', unitCost: 30, qty: 2 }] },
    });
    expect(piece.actualMaterials).toHaveLength(1);
    expect(piece.totalCOGS).toBe(60);
  });
});
