import { describe, expect, it } from 'vitest';
import { planGemstoneMigration } from '@/lib/migrations/gemstoneListingsToDesigns';
import { validateDesign } from '@/app/api/designs/model';

const listing = {
  productId: 'gem_abc123',
  title: 'Montana Sapphire 2.1ct',
  description: 'A cushion sapphire',
  images: ['https://cdn/img1.jpg'],
  internalNotes: 'from the July parcel',
  seller: { userId: 'artisan-7', displayName: 'Cutter Co' },
  pricing: { retailPrice: 1200, costBasis: 400 },
  inventory: { available: true, reserved: false },
  gemstone: {
    species: 'Sapphire', carat: 2.1, dimensions: { length: 7.2, width: 6.9, height: 4.1 },
    cut: ['Cushion'], color: ['Blue'], clarity: 'VS', naturalSynthetic: 'natural',
    certification: { lab: 'GIA', number: '123' },
  },
};

describe('planGemstoneMigration', () => {
  const plan = planGemstoneMigration(listing);

  it('maps the listing to a one-of-one gemstone Design spec', () => {
    const d = plan.designSpec;
    expect(d.category).toBe('gemstone');
    expect(d.productionMethod).toBe('handmade');
    expect(d.status).toBe('ready');
    expect(d.edition).toMatchObject({ type: 'one_of_one', allocated: 1, committed: 0 });
    expect(d.name).toBe('Montana Sapphire 2.1ct');
    expect(d.gemstone.species).toBe('Sapphire');
    expect(d.gemstone.carat).toBe(2.1);
    expect(d.gemstoneId).toBe('gem_abc123');       // flywheel back-link
    expect(d.suggestedRetail).toBe(1200);
    expect(d.estCost).toBe(400);
    expect(d.referenceImages).toEqual(['https://cdn/img1.jpg']);
    expect(d.primaryArtisanId).toBe('artisan-7');
  });

  it('builds a rough/cut variant with NO ring sizing', () => {
    const v = plan.designSpec.variants[0];
    expect(v.sku).toBe('GEM-gem_abc123');
    expect(v.active).toBe(true);
    expect(v.roughQty).toBe(1);
    expect(v.caratEach).toBe(2.1);
    expect(v.ringSize).toBeUndefined();
    expect(v.sizingAllowance).toBeUndefined();
  });

  it('plans an AVAILABLE (RTS) piece for an in-stock stone', () => {
    expect(plan.pieceStatus).toBe('available');
    expect(plan.resolvedConfiguration).toMatchObject({ species: 'Sapphire', carat: 2.1 });
  });

  it('produces a spec that PASSES the real validateDesign', () => {
    expect(validateDesign(plan.designSpec).valid).toBe(true);
  });

  it('marks the piece RESERVED when the listing is not available', () => {
    const p = planGemstoneMigration({ ...listing, inventory: { available: false } });
    expect(p.pieceStatus).toBe('reserved');
  });

  it('falls back to the title as species when gemstone.species is missing', () => {
    const p = planGemstoneMigration({ productId: 'gem_x', title: 'Mystery Stone', gemstone: {} });
    expect(p.designSpec.gemstone.species).toBe('Mystery Stone');
    expect(validateDesign(p.designSpec).valid).toBe(true);
  });
});
