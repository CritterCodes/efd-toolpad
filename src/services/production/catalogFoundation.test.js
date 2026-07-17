import { describe, expect, it } from 'vitest';
import { validateDrop } from '@/app/api/drops/model';
import { validateCollection } from '@/app/api/collections/model';
import { validateDesign } from '@/app/api/designs/model';
import { validatePiece } from '@/app/api/pieces/model';
import { catalogFixtures } from '@/services/production/catalogFixtures';
import { projectDesignProduct } from '@/services/production/productProjection';

describe('catalog foundation contracts', () => {
  it('keeps Drops and smart Collections as separate validated schemas', () => {
    expect(validateDrop({ name: 'Fall', slug: 'fall-2026', ownerType: 'efd', status: 'draft', channels: ['online'] }).valid).toBe(true);
    expect(validateDrop({ name: 'Fall', slug: 'Fall 2026', ownerType: 'artisan', status: 'scheduled' }).errors).toEqual(expect.arrayContaining([
      'slug must be URL-safe', 'ownerId is required for artisan drops', 'releaseAt is required when scheduled',
    ]));
    expect(validateCollection({ name: 'MTO', slug: 'made-to-order', status: 'published', rules: { all: [{ field: 'offers', operator: 'contains', value: 'made_to_order' }] } }).valid).toBe(true);
    expect(validateCollection({ name: 'Bad', slug: 'bad', status: 'published', rules: { all: [{ field: '$where', operator: 'eq', value: true }] } }).valid).toBe(false);
  });

  it('validates embedded variants, edition counters, and nominal ring sizing', () => {
    const design = {
      status: 'ready', productionMethod: 'cad_cast', category: 'ring',
      edition: { type: 'limited', limit: 2, allocated: 1, committed: 1 },
      variants: [{ variantId: 'v-7', sku: 'RING-7', active: true, ringSize: '7', sizingAllowance: { min: '6', max: '8' } }],
    };
    expect(validateDesign(design, { requireSellable: true }).valid).toBe(true);
    expect(validateDesign({ ...design, edition: { ...design.edition, committed: 2 } }).errors).toContain('edition capacity exceeded');
    expect(validateDesign({ ...design, variants: [{ variantId: 'v', sku: 'R', active: true }] }).valid).toBe(false);
    expect(validatePiece({ designID: 'd1', variantId: 'v-7', resolvedConfiguration: { ringSize: '7.25' }, status: 'planned' }).valid).toBe(true);
    expect(validatePiece({ designID: 'd1', status: 'planned' }).valid).toBe(false);
  });

  it('projects only available Pieces and Design-wide committed capacity', () => {
    const projected = projectDesignProduct({
      product: { productId: 'ring', title: 'Ring' },
      design: { designID: 'd1', edition: { type: 'limited', limit: 3, allocated: 1, committed: 1 }, variants: [{ variantId: 'v1', sku: 'V1', active: true, pricing: { retailPrice: 500 }, ringSize: '7' }] },
      pieces: [{ pieceID: 'available', variantId: 'v1', status: 'available' }, { pieceID: 'sold', variantId: 'v1', status: 'sold' }],
    });
    expect(projected.productType).toBe('jewelry');
    expect(projected.edition.remaining).toBe(1);
    expect(projected.variants[0].offers.readyToShip).toEqual({ quantity: 1, pieceIDs: ['available'] });
    expect(projected.variants[0].offers.madeToOrder.enabled).toBe(true);
    expect(JSON.stringify(projected)).not.toContain('concept');
  });

  it('creates deterministic, isolated DEV and preview fixtures', () => {
    expect(catalogFixtures('dev')).toEqual(catalogFixtures('dev'));
    expect(catalogFixtures('preview').drops[0].dropId).toMatch(/^preview-/);
    expect(catalogFixtures('dev').drops[0].dropId).toMatch(/^dev-/);
    expect(() => catalogFixtures('production')).toThrow();
  });

  it('fixtures include one drop with two designs (MTO + RTS) and at least one piece for Designs/Pieces tab review', () => {
    const f = catalogFixtures('preview');
    expect(f.drops).toHaveLength(1);
    expect(f.designs.length).toBeGreaterThanOrEqual(2);
    expect(f.pieces.length).toBeGreaterThanOrEqual(1);
    expect(f.collections).toHaveLength(2);

    const drop = f.drops[0];
    expect(drop.designOrder).toHaveLength(2);

    const mto = f.designs.find((d) => d.edition?.type === 'limited');
    expect(mto).toBeDefined();
    expect(mto.category).toBe('ring');
    expect(mto.variants[0].ringSize).toBeTruthy();
    expect(mto.dropId).toBe(drop.dropId);
    expect(validateDesign(mto).valid).toBe(true);

    const rts = f.designs.find((d) => d.edition?.type === 'one_of_one');
    expect(rts).toBeDefined();
    expect(rts.status).toBe('ready');
    expect(rts.dropId).toBe(drop.dropId);
    expect(validateDesign(rts).valid).toBe(true);

    const piece = f.pieces[0];
    expect(piece.dropId).toBe(drop.dropId);
    expect(piece.designID).toBe(rts.designID);
    expect(piece.status).toBe('available');
    expect(validatePiece(piece).valid).toBe(true);

    const oneOfOne = f.collections.find((c) => c.rules?.all?.[0]?.field === 'edition.type');
    expect(oneOfOne).toBeDefined();
    expect(oneOfOne.rules.all[0].value).toBe('one_of_one');

    const mtoCollection = f.collections.find((c) => c.rules?.all?.[0]?.field === 'offers');
    expect(mtoCollection).toBeDefined();
  });
});
