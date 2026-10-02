import { describe, it, expect } from 'vitest';

/**
 * The rule-based fallback extractors — what smart intake falls back to when the
 * AI is unreachable. Pinned against the owner's hard case:
 *   "size 7 14kt yg ring size down 3 sizes, tighten stones and retip 14 prongs"
 * Before this: "size 7" was read as the DESIRED size (backwards), and
 * "14kt"/"yg" matched no metal at all.
 */
const { extractRingSizesFromDescription, extractMetalContextFromDescription } =
  await import('@/services/repairs/smartIntakeExtractors');

const HARD = 'size 7 14kt yg ring size down 3 sizes, tighten stones and retip 14 prongs. due next tuesday';

describe('extractRingSizesFromDescription', () => {
  it('resolves RELATIVE sizing: size 7, down 3 → current 7, desired 4', () => {
    expect(extractRingSizesFromDescription(HARD)).toEqual({ currentRingSize: '7', desiredRingSize: '4' });
  });

  it('resolves size up relative to the start', () => {
    expect(extractRingSizesFromDescription('sz 5 ring, size up 2 sizes')).toEqual({ currentRingSize: '5', desiredRingSize: '7' });
  });

  it('a relative direction with NO start size fills nothing — never the delta', () => {
    // The old single-size pattern would have written "3" into a size field.
    expect(extractRingSizesFromDescription('ring, sizing down 3 sizes')).toEqual({ currentRingSize: '', desiredRingSize: '' });
  });

  it('explicit pairs still work exactly as before', () => {
    expect(extractRingSizesFromDescription('resize from 7 to 4')).toEqual({ currentRingSize: '7', desiredRingSize: '4' });
  });

  // Found clicking through the intake, 2026-10-01: the karat was read as a NUMBER OF SIZES, and "7 down to 6" had
  // no pattern, so the single-size rule called 7 the desired size — backwards.
  it('a karat is never a size: "size down 14k … from 7 to 6" is 7 → 6', () => {
    expect(extractRingSizesFromDescription('Size down 14k yellow gold ring from 7 to 6, due friday'))
      .toEqual({ currentRingSize: '7', desiredRingSize: '6' });
  });

  it('"size 7 down to 6" / "size 9 up to 10.5" read current → desired', () => {
    expect(extractRingSizesFromDescription('size 7 down to 6')).toEqual({ currentRingSize: '7', desiredRingSize: '6' });
    expect(extractRingSizesFromDescription('ring size 9 up to 10.5 please')).toEqual({ currentRingSize: '9', desiredRingSize: '10.5' });
  });

  it('"currently a 9, needs a 7.5"', () => {
    expect(extractRingSizesFromDescription('currently a 9, needs a 7.5')).toEqual({ currentRingSize: '9', desiredRingSize: '7.5' });
  });

  it('a karat change is not a ring size', () => {
    expect(extractRingSizesFromDescription('convert 14k to 18k')).toEqual({ currentRingSize: '', desiredRingSize: '' });
    expect(extractRingSizesFromDescription('size up 2 sizes, 14kt band, it is a size 6')).toEqual({ currentRingSize: '6', desiredRingSize: '8' });
  });
});

describe('extractMetalContextFromDescription', () => {
  it('reads jeweler shorthand: 14kt yg', () => {
    expect(extractMetalContextFromDescription(HARD)).toEqual({ metalType: 'gold', karat: '14k', goldColor: 'yellow' });
  });

  it('wg / rg map to their colors', () => {
    expect(extractMetalContextFromDescription('18kt wg band')).toEqual({ metalType: 'gold', karat: '18k', goldColor: 'white' });
    expect(extractMetalContextFromDescription('10 kt rg ring')).toEqual({ metalType: 'gold', karat: '10k', goldColor: 'rose' });
  });

  it('spelled-out forms are untouched', () => {
    expect(extractMetalContextFromDescription('14k white gold ring')).toEqual({ metalType: 'gold', karat: '14k', goldColor: 'white' });
    expect(extractMetalContextFromDescription('platinum band')).toEqual({ metalType: 'platinum', karat: '', goldColor: '' });
  });
});
