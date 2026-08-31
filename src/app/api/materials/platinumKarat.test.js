import { describe, it, expect } from 'vitest';
import MaterialService from './service';

/**
 * Platinum variants arrive from Stuller with no karat — purity lives in
 * qualityCode ("PLIR"). The karat is the key the pricing engine joins on
 * (intake sends platinum_950), so a null left EVERY platinum job unpriceable:
 * before this, a platinum half-shank priced its sizing stock at $0 and intake
 * undercharged it at silver-ish prices. The sanitizer now derives the key, so
 * the next Stuller import can't regress the fix that was applied to the data.
 */
describe('sanitizeStullerProducts platinum karat', () => {
  const sanitize = (p) => MaterialService.sanitizeStullerProducts([p])[0];

  it('derives 950 for a platinum variant with no karat (the PLIR shape)', () => {
    const out = sanitize({ metalType: 'platinum', karat: null, qualityCode: 'PLIR', qualityDisplay: 'Platinum Iridium' });
    expect(out.karat).toBe('950');
  });

  it('honors an explicit purity in the quality text', () => {
    expect(sanitize({ metalType: 'platinum', qualityDisplay: 'Platinum 900' }).karat).toBe('900');
    expect(sanitize({ metalType: 'platinum', description: 'Pt 999 wire' }).karat).toBe('999');
  });

  it('never touches a platinum variant that already has a karat', () => {
    expect(sanitize({ metalType: 'platinum', karat: '900' }).karat).toBe('900');
  });

  it('leaves non-platinum metals exactly as before', () => {
    expect(sanitize({ metalType: 'yellow_gold', karat: null }).karat).toBeNull();
    expect(sanitize({ metalType: 'yellow_gold', karat: '14K' }).karat).toBe('14K');
  });
});
