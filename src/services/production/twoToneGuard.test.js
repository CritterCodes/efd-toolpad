import { describe, it, expect } from 'vitest';
import { isTwoTone, metalFinishes, deriveFinish, composeMetalKey } from '@/services/production/variantMetal';

/**
 * TWO-TONE PRICING GUARD.
 *
 * Mounting cost = the design's FULL `stlVolumeCm3` × ONE metal, where that metal comes from
 * `deriveFinish` → the FIRST metal slot in the REFRAKT config. That is correct for a design sold in
 * several metal OPTIONS (each variant is wholly one metal, and the Pricing tab prices the full volume
 * once per distinct `variant.metalKey`). It is WRONG for one piece made of two metals — a yellow band
 * with a white head prices as 100% of whichever finish is listed first.
 *
 * Pricing that properly needs volume per mesh, which the model doesn't capture. So this guard exists to
 * make the case visible instead of silently producing a wrong number.
 *
 * Context: as of 2026-07-31 NO design in production has a meshMap at all, so this is latent, not a live
 * mispricing. The guard is here so the first two-tone design can't slip through unnoticed.
 */

const metal = (finish) => ({ type: 'metal', finish });
const gem = (gemPreset = 'diamond') => ({ type: 'gem', gemPreset });

describe('metalFinishes', () => {
  it('returns distinct finishes in first-seen order', () => {
    expect(metalFinishes({ meshMap: [metal('gold'), gem(), metal('whiteGold'), metal('gold')] }))
      .toEqual(['gold', 'whiteGold']);
  });

  it('ignores gem slots and slots with no finish', () => {
    expect(metalFinishes({ meshMap: [gem(), { type: 'metal' }, metal('platinum')] })).toEqual(['platinum']);
  });

  it('tolerates a missing / empty / malformed config', () => {
    for (const cfg of [undefined, null, {}, { meshMap: null }, { meshMap: [] }, { meshMap: [null, undefined] }]) {
      expect(metalFinishes(cfg)).toEqual([]);
    }
  });
});

describe('isTwoTone', () => {
  it('is TRUE when the config mixes finishes — the case that misprices', () => {
    expect(isTwoTone({ meshMap: [metal('gold'), metal('whiteGold')] })).toBe(true);
    expect(isTwoTone({ meshMap: [metal('roseGold'), gem(), metal('platinum')] })).toBe(true);
  });

  it('is FALSE for a single metal, however many slots use it', () => {
    // Several meshes sharing one finish is still one metal, and prices correctly — so this must not
    // warn. That's why the check counts DISTINCT finishes rather than slots.
    expect(isTwoTone({ meshMap: [metal('gold'), metal('gold'), metal('gold')] })).toBe(false);
    expect(isTwoTone({ meshMap: [metal('gold')] })).toBe(false);
  });

  it('is FALSE for a gem-only or empty config (nothing to misprice)', () => {
    expect(isTwoTone({ meshMap: [gem(), gem('sapphire')] })).toBe(false);
    expect(isTwoTone(undefined)).toBe(false);
    expect(isTwoTone({})).toBe(false);
  });
});

describe('why the guard is needed — deriveFinish silently collapses a two-tone config', () => {
  it('picks only the FIRST metal slot, discarding the rest', () => {
    const twoTone = { meshMap: [metal('gold'), metal('whiteGold')] };
    expect(deriveFinish(twoTone)).toBe('gold');            // the white gold is simply dropped
    expect(metalFinishes(twoTone)).toEqual(['gold', 'whiteGold']);
    // ...and that single finish becomes the one metalKey the full volume is priced at.
    expect(composeMetalKey(deriveFinish(twoTone), '14')).toBe('GOLD_14K_YELLOW');
  });

  it('order decides the price, which is the whole hazard', () => {
    // Same physical piece, slots listed in the other order → a different metal, so a different price.
    const a = { meshMap: [metal('silver'), metal('platinum')] };
    const b = { meshMap: [metal('platinum'), metal('silver')] };
    expect(composeMetalKey(deriveFinish(a), '14')).toBe('SILVER_STERLING');
    expect(composeMetalKey(deriveFinish(b), '14')).toBe('PLATINUM_IRIDIUM');
    expect(isTwoTone(a) && isTwoTone(b)).toBe(true);   // both caught
  });
});
