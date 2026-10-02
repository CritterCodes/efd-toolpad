import { describe, it, expect } from 'vitest';
import { isRingSizingTask, ticketSizesRing, ringSizeNumber } from './ringSizing';

/**
 * Owner, 2026-10-01 (Q12): ring sizes are required only when the ticket sizes the ring up or down.
 * The corpus below is every repair task title in production on 2026-10-01, so the split is pinned against the real
 * catalog — in particular the two that consume sizing stock without resizing anything.
 */
const SIZES_THE_RING = [
  'Size Down',
  'Size Down — Platinum (laser welded)',
  'Size Up  - 3mm to 5mm shanks',
  'Size Up (1 size) — Platinum (laser welded)',
  'Size Up (Customer Supplied Gold)',
  'Size up (1 size) - up to 3mm x 2 mm shank',
];

const DOES_NOT = [
  // Consume sizing stock, but no from→to: a shank repair and a bead that tightens the fit.
  'Half-Shank — up to 3mm',
  'Half-Shank — 3 to 5mm',
  'Half-Shank — Platinum, up to 3mm (laser welded)',
  'Half-Shank — Platinum, 3 to 5mm (laser welded)',
  'Sizing Beads',
  // The rest of the catalog.
  'Break in Shank', 'Laser Weld', 'Reshape Ring', 'Retip prongs', 'Solder Together per Ring',
  'Add 18gu Jump Ring w/ laser — 5mm and smaller', 'Add 18gu Jump Ring — 5mm and smaller', 'Break in chain', 'Clasp Repair',
  'Clean and Polish', 'Glue Pearl', 'Rhodium Plating', 'Reprong', 'Straighten Prongs — up to 20 stones',
  'Check & Tighten < 20 stones', 'Check & Tighten — over 20 stones', 'Set Stone 0.5ct to 0.99ct', 'Set Stone 1ct or larger',
  'Set Stone less than0.49ct', 'Watch Battery', 'Watch Link Removal',
];

describe('isRingSizingTask (the 2026-10-01 catalog)', () => {
  it.each(SIZES_THE_RING)('sizes the ring: %s', (title) => {
    expect(isRingSizingTask({ title })).toBe(true);
  });

  it.each(DOES_NOT)('does not size the ring: %s', (title) => {
    expect(isRingSizingTask({ title })).toBe(false);
  });

  it('reads whichever name field a line carries, and survives a line with none', () => {
    expect(isRingSizingTask({ displayName: 'Size Up (Customer Supplied Gold)' })).toBe(true);
    expect(isRingSizingTask({ name: 'Resize to 7' })).toBe(true);
    expect(isRingSizingTask({})).toBe(false);
    expect(isRingSizingTask(null)).toBe(false);
  });
});

describe('ticketSizesRing', () => {
  it('is true when any line sizes the ring', () => {
    expect(ticketSizesRing([{ title: 'Rhodium Plating' }, { title: 'Size Down' }])).toBe(true);
  });

  it('is false for a ring ticket that never touches the size', () => {
    expect(ticketSizesRing([{ title: 'Rhodium Plating' }, { title: 'Sizing Beads' }])).toBe(false);
    expect(ticketSizesRing([])).toBe(false);
    expect(ticketSizesRing(undefined)).toBe(false);
  });
});

describe('ringSizeNumber', () => {
  it('a blank or unreadable size is unknown, never 0 (Q12)', () => {
    expect(ringSizeNumber('')).toBeNull();
    expect(ringSizeNumber('   ')).toBeNull();
    expect(ringSizeNumber(null)).toBeNull();
    expect(ringSizeNumber(undefined)).toBeNull();
    expect(ringSizeNumber('size 6')).toBeNull();
    expect(ringSizeNumber('0')).toBeNull(); // there is no ring size 0
  });

  it('reads a written size', () => {
    expect(ringSizeNumber('7')).toBe(7);
    expect(ringSizeNumber(' 6.5 ')).toBe(6.5);
    expect(ringSizeNumber(8)).toBe(8);
  });
});
