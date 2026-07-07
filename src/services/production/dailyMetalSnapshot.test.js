import { describe, it, expect } from 'vitest';
import { currentPriceDay, toRates } from '@/services/production/dailyMetalSnapshot';

describe('currentPriceDay', () => {
  it('returns the UTC calendar day (YYYY-MM-DD)', () => {
    expect(currentPriceDay(new Date('2026-07-07T05:25:00Z'))).toBe('2026-07-07');
    expect(currentPriceDay(new Date('2026-07-07T23:59:59Z'))).toBe('2026-07-07');
    expect(currentPriceDay(new Date('2026-12-31T00:00:00Z'))).toBe('2026-12-31');
  });
});

describe('toRates', () => {
  it('coerces the four metal categories to numbers, defaulting missing to 0', () => {
    expect(toRates({ gold: 129.83, silver: '1.6', platinum: 49.4 }))
      .toEqual({ gold: 129.83, silver: 1.6, platinum: 49.4, palladium: 0 });
  });
  it('handles null/garbage docs safely', () => {
    expect(toRates(null)).toEqual({ gold: 0, silver: 0, platinum: 0, palladium: 0 });
    expect(toRates({ gold: 'x' })).toEqual({ gold: 0, silver: 0, platinum: 0, palladium: 0 });
  });
});
