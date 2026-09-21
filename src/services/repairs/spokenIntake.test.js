import { describe, expect, it } from 'vitest';
import { normalizeSpokenIntake } from './spokenIntake';
import { extractMetalContextFromDescription, extractRingSizesFromDescription } from './smartIntakeExtractors';

describe('normalizeSpokenIntake — dictated text into the written forms the extractors match', () => {
  it('folds spoken karats into Nk', () => {
    expect(normalizeSpokenIntake('14 karat white gold ring')).toBe('14k white gold ring');
    expect(normalizeSpokenIntake('Fourteen carat yellow gold')).toBe('14k yellow gold');
    expect(normalizeSpokenIntake('18 KT rose gold band')).toBe('18k rose gold band');
    expect(normalizeSpokenIntake('twenty two karat bangle')).toBe('22k bangle');
  });

  it('never touches stone weights or other numbers', () => {
    expect(normalizeSpokenIntake('reset a 1 carat diamond in 14 karat')).toBe('reset a 1 carat diamond in 14k');
    expect(normalizeSpokenIntake('2 carat sapphire, 5 stones')).toBe('2 carat sapphire, 5 stones');
  });

  it('folds fraction words and glyphs into ring sizes', () => {
    expect(normalizeSpokenIntake('size 7 and a half down to 6')).toBe('size 7.5 down to 6');
    expect(normalizeSpokenIntake('from 6 1/2 to 7 and a quarter')).toBe('from 6.5 to 7.25');
    expect(normalizeSpokenIntake('size 8¾ to 9½')).toBe('size 8.75 to 9.5');
    expect(normalizeSpokenIntake('size 5 three quarters')).toBe('size 5.75');
  });

  it('is a no-op on already-written intake and on empty input', () => {
    const typed = 'size 7 14kt yg ring size down 3 sizes, tighten stones and retip 14';
    expect(normalizeSpokenIntake(typed)).toBe('size 7 14k yg ring size down 3 sizes, tighten stones and retip 14');
    expect(normalizeSpokenIntake('')).toBe('');
    expect(normalizeSpokenIntake(undefined)).toBe('');
  });

  it('what the recognizer says now reaches the extractors', () => {
    const spoken = normalizeSpokenIntake('14 karat white gold ring, from 7 and a half to 6, retip two prongs');
    expect(extractMetalContextFromDescription(spoken)).toMatchObject({ metalType: 'gold', karat: '14k' });
    expect(extractRingSizesFromDescription(spoken)).toMatchObject({ currentRingSize: '7.5', desiredRingSize: '6' });
  });
});
