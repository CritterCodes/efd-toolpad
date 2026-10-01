import { describe, it, expect } from 'vitest';
import { deterministicFeatureExtraction } from './leadFeatures';

/**
 * Lead scoring falls back to deterministicFeatureExtraction whenever Gemini fails (scoring.js). After the 2026-10-01
 * split of wholesaleLeadService.js it imported inferLeadBusinessHints from a module that doesn't export it, so the
 * fallback threw "inferLeadBusinessHints is not a function" — exactly when it was needed. Run it.
 */
describe('deterministicFeatureExtraction (the no-Gemini fallback)', () => {
  it('scores a bare lead without throwing', () => {
    expect(() => deterministicFeatureExtraction({}, new Error('Gemini down'))).not.toThrow();
  });

  it('reads the lead it is given', () => {
    const lead = { storeName: 'Greers Pawn', notes: 'pawn shop, buys gold', googleBusinessTypes: ['pawn_shop'] };
    const out = deterministicFeatureExtraction(lead, null);
    expect(out && typeof out).toBe('object');
  });
});
