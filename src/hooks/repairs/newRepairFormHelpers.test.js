import { describe, it, expect } from 'vitest';
import { parsePromiseDateFromDescription, normalizeIsoPromiseDate, getRingSizeDelta, getAdditionalSizingMaterialQuantity } from './newRepairFormHelpers';

/** The intake form's pure helpers, testable outside the hook since the max-lines split. */
const WED = new Date(2026, 8, 30, 12); // Wednesday 2026-09-30

describe('parsePromiseDateFromDescription', () => {
  it('reads an ISO date, a slash date and a month name', () => {
    expect(parsePromiseDateFromDescription('size it, due 2026-10-09', WED)).toBe('2026-10-09');
    expect(parsePromiseDateFromDescription('need by 10/9', WED)).toBe('2026-10-09');
    expect(parsePromiseDateFromDescription('ready October 9th, 2026', WED)).toBe('2026-10-09');
  });

  it('reads today, tomorrow and weekdays from the reference date', () => {
    expect(parsePromiseDateFromDescription('due today', WED)).toBe('2026-09-30');
    expect(parsePromiseDateFromDescription('pick up tomorrow', WED)).toBe('2026-10-01');
    expect(parsePromiseDateFromDescription('by friday', WED)).toBe('2026-10-02');
    expect(parsePromiseDateFromDescription('next wednesday', WED)).toBe('2026-10-07');
  });

  it('finds no date in plain text', () => {
    expect(parsePromiseDateFromDescription('replace the clasp', WED)).toBe('');
    expect(parsePromiseDateFromDescription('', WED)).toBe('');
  });
});

describe('normalizeIsoPromiseDate', () => {
  it('keeps an ISO date and blanks garbage', () => {
    expect(normalizeIsoPromiseDate('2026-10-09')).toBe('2026-10-09');
    expect(normalizeIsoPromiseDate('not a date')).toBe('');
    expect(normalizeIsoPromiseDate('')).toBe('');
  });
});

describe('ring sizing', () => {
  it('measures the size change, 0 when a size is not a number', () => {
    expect(getRingSizeDelta('6', '8.5')).toBe(2.5);
    expect(getRingSizeDelta('7', '6')).toBe(-1);
    expect(getRingSizeDelta('size 6', '8')).toBe(0);
    // Q12, fixed 2026-10-01 on the owner's ruling: a BLANK size is unknown, not size 0. It used to read as 0
    // (Number('') === 0), so "resize to 8" with no current size looked like an eight-size jump and suggested
    // seven half-sizes of sizing stock nobody asked for.
    expect(getRingSizeDelta('', '8')).toBe(0);
    expect(getRingSizeDelta('8', '')).toBe(0);
  });

  it('adds sizing stock only past the first size up, in half sizes', () => {
    expect(getAdditionalSizingMaterialQuantity('6', '7')).toBe(0);
    expect(getAdditionalSizingMaterialQuantity('6', '8.5')).toBe(1.5);
    expect(getAdditionalSizingMaterialQuantity('8', '6')).toBe(0);
  });
});
