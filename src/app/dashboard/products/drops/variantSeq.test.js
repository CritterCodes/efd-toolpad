import { describe, it, expect } from 'vitest';
import { nextVariantSeq } from '@/app/dashboard/products/drops/[dropId]/designs/[designId]/page';

/**
 * Owner report 2026-07-31: "when i create a new variant, it gives it the same name as the last variant
 * we made instead of some sort of new name in sequence."
 *
 * Cause: the counter was a MODULE-LEVEL `let variantSeq = 0`, so it reset on every page load. The first
 * variant added after a reload was numbered 1 again and got the same auto-SKU as an existing row — which
 * save then rejected for duplicate SKUs. Deriving the number from the variants that already exist can't
 * drift with page lifecycle.
 */

const v = (sku) => ({ sku });

describe('nextVariantSeq', () => {
  it('starts at 1 for a design with no variants', () => {
    expect(nextVariantSeq([])).toBe(1);
    expect(nextVariantSeq()).toBe(1);
  });

  it('continues from the highest existing number — the actual bug', () => {
    // After a reload the module counter was 0, so this used to return 1 and collide with RING-1.
    expect(nextVariantSeq([v('RING-1'), v('RING-2'), v('RING-3')])).toBe(4);
  });

  it('uses the MAX, not the count, so deleting a middle row cannot cause a collision', () => {
    // Count would say 3 → RING-3, which already exists.
    expect(nextVariantSeq([v('RING-1'), v('RING-2'), v('RING-4')])).toBe(5);
  });

  it('ignores hand-edited SKUs that carry no trailing number', () => {
    expect(nextVariantSeq([v('CUSTOM-YELLOW'), v('RING-7')])).toBe(8);
    expect(nextVariantSeq([v('CUSTOM-YELLOW')])).toBe(1);
  });

  it('reads only the TRAILING number, not digits elsewhere in the name', () => {
    expect(nextVariantSeq([v('BAND-14K-2')])).toBe(3);
    expect(nextVariantSeq([v('BAND-18K')])).toBe(1);
  });

  it('tolerates missing, blank and malformed rows', () => {
    expect(nextVariantSeq([null, undefined, {}, v(''), v('RING-2')])).toBe(3);
  });
});
