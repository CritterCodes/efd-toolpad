import { describe, it, expect, vi } from 'vitest';

// Same shims the route's own test uses — importing the route pulls in next-auth, which does not
// resolve under vitest. The functions under test are pure.
vi.mock('next/server', () => ({ NextResponse: { json: vi.fn((data) => data) } }));
vi.mock('@/services/ai/smartIntakeLog', () => ({ recordIntakeSuggestion: vi.fn(async () => 'sil-test') }));
vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

const { applyDefaultPurity, normalizeKaratValue, normalizeParsedPayload } = await import('./parse-smart-intake/route.js');
const { metalKey } = await import('@/services/pricing/engine');

/**
 * GUARD: A SILVER JOB HAS TO REACH A PRICE.
 *
 * Owner, 2026-10-12: "whenever I say in the AI smart intake that it's silver, you get to the pricing
 * of the tasks, and it says that you need to input a metal type."
 *
 * Silver and platinum carry their purity in the NAME, so nobody says it out loud — "sterling silver
 * ring, size to 7.5" states no karat. The model returned `karat: ""`, and `metalKey` refuses any
 * non-gold metal without one, which the engine reports as METAL_REQUIRED. So the metal was filled in
 * on screen and the pricing step still demanded a metal.
 *
 * The engine's half of this was fixed on 2026-09-30 (EFD-SILVER-PRICING: `silver` + `925` now maps to
 * `sterling_silver_925`, the name the stock is filed under). That fix could never fire, because intake
 * never supplied the 925.
 *
 * These assert the whole path, intake value → priceable key, not just the normalizer in isolation —
 * that is the join where this went wrong.
 */

describe('purity that nobody says out loud', () => {
  it('prices a plain "silver" job end to end', () => {
    const parsed = normalizeParsedPayload({ metalType: 'silver', karat: '' });
    expect(parsed.karat).toBe('925');
    expect(metalKey(parsed)).toBe('sterling_silver_925');
  });

  it('prices a plain "platinum" job end to end', () => {
    const parsed = normalizeParsedPayload({ metalType: 'platinum', karat: '' });
    expect(parsed.karat).toBe('950');
    expect(metalKey(parsed)).toBe('platinum_950');
  });

  it('is the exact failure the owner reported: no default means no price', () => {
    // metalKey returns null for a non-gold metal with no karat, and null IS the METAL_REQUIRED the
    // pricing step shows. This is the before-state, asserted so it cannot quietly return.
    expect(metalKey({ metalType: 'silver', karat: '' })).toBeNull();
  });

  it('NEVER overwrites a purity that was actually stated', () => {
    // Fine silver has no stock on purpose — the engine refuses it rather than borrowing sterling's
    // cost. Defaulting 999 to 925 would invent a price, which is worse than refusing one.
    expect(applyDefaultPurity('silver', '999')).toBe('999');
    expect(applyDefaultPurity('platinum', '900')).toBe('900');
    expect(normalizeParsedPayload({ metalType: 'silver', karat: '999' }).karat).toBe('999');
  });

  it('leaves gold alone — its karat is always spoken, and guessing one would be a wrong price', () => {
    expect(applyDefaultPurity('gold', '')).toBe('');
    expect(normalizeParsedPayload({ metalType: 'gold', karat: '' }).karat).toBe('');
  });

  it('leaves costume and an unknown metal alone', () => {
    expect(applyDefaultPurity('costume', '')).toBe('');
    expect(applyDefaultPurity('', '')).toBe('');
  });

  it('still normalizes what the model does say', () => {
    expect(normalizeKaratValue('14 kt')).toBe('14k');
    expect(normalizeKaratValue('925')).toBe('925');
    expect(normalizeKaratValue('rubbish')).toBe('');
  });
});
