import { describe, expect, it } from 'vitest';
import { repriceGemAtClaim, gemClaimWithinCaps, cutterPayoutNetOfRough, gemCutTarget } from '@/services/production/gemClaim';

describe('repriceGemAtClaim (pure — authoritative reprice)', () => {
  const gemstone = {
    yield: 0.25, cutLaborCost: 60,
    colors: [{ label: 'AAA', rates: [{ upToCt: 2, ratePerCarat: 90 }, { upToCt: 5, ratePerCarat: 70 }] }],
  };
  it('reprices at the actual carat via strict tiers', () => {
    // 2.1ct → beyond tier1 (upTo 2) → tier2 rate 70; rough = 2.1/0.25 = 8.4ct; material = 8.4×70=588; +60 labor = 648
    const r = repriceGemAtClaim({ gemstone, colorLabel: 'AAA', carat: 2.1 });
    expect(r.priceable).toBe(true);
    expect(r.estCost).toBe(648);
  });
  it('is a special request beyond the last tier', () => {
    expect(repriceGemAtClaim({ gemstone, colorLabel: 'AAA', carat: 6 })).toEqual({ priceable: false, reason: expect.stringContaining('beyond') });
  });
  it('rejects an unknown color', () => {
    expect(repriceGemAtClaim({ gemstone, colorLabel: 'nope', carat: 1 }).priceable).toBe(false);
  });
});

describe('gemClaimWithinCaps (pure)', () => {
  it('uncapped when neither maxPieces nor lotQty is set', () => {
    expect(gemClaimWithinCaps({ gemstone: {}, alreadyClaimed: 100 })).toEqual({ ok: true, cap: null });
  });
  it('enforces the smaller of maxPieces and lotQty', () => {
    expect(gemClaimWithinCaps({ gemstone: { maxPieces: 2, lotQty: 5 }, alreadyClaimed: 1 })).toMatchObject({ ok: true, cap: 2 });
    expect(gemClaimWithinCaps({ gemstone: { maxPieces: 2, lotQty: 5 }, alreadyClaimed: 2 }).ok).toBe(false);
  });
  it('lotQty alone caps', () => {
    expect(gemClaimWithinCaps({ gemstone: { lotQty: 3 }, alreadyClaimed: 3 }).ok).toBe(false);
    expect(gemClaimWithinCaps({ gemstone: { lotQty: 3 }, alreadyClaimed: 2 }).ok).toBe(true);
  });
});

describe('cutterPayoutNetOfRough (pure — §4d)', () => {
  it('nets the fronted rough out of the consignment payout', () => {
    // gross 1000, 20% consignment = 200 → 800; minus 300 fronted rough = 500
    expect(cutterPayoutNetOfRough({ grossSale: 1000, consignmentRate: 0.20, frontedRoughCost: 300 }))
      .toEqual({ grossSale: 1000, consignmentAmount: 200, frontedRoughCost: 300, payoutAmount: 500 });
  });
  it('floors at zero when the rough exceeds the net', () => {
    expect(cutterPayoutNetOfRough({ grossSale: 100, consignmentRate: 0.20, frontedRoughCost: 500 }).payoutAmount).toBe(0);
  });
  it('no fronted rough → standard consignment payout', () => {
    expect(cutterPayoutNetOfRough({ grossSale: 1000, consignmentRate: 0.20 }).payoutAmount).toBe(800);
  });
});

describe('gemCutTarget (pure)', () => {
  it('carries species/color/size and infers sizeMode', () => {
    const t = gemCutTarget({
      gemstone: { species: 'sapphire', naturalSynthetic: 'lab', treatment: 'unheated' },
      claim: { gemColor: 'cornflower' },
      resolvedConfiguration: { targetMm: 6, tolerance: 0.2 },
    });
    expect(t).toMatchObject({ sizeMode: 'dimensions', species: 'sapphire', color: 'cornflower', targetMm: 6, tolerance: 0.2, creation: 'lab', treatment: 'unheated' });
  });
  it('defaults to carat sizeMode when no mm', () => {
    expect(gemCutTarget({ gemstone: { species: 'amethyst' }, claim: {}, resolvedConfiguration: { carat: 1.5 } }))
      .toMatchObject({ sizeMode: 'carat', carat: 1.5, creation: 'natural' });
  });
});
