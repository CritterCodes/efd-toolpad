import { describe, expect, it } from 'vitest';
import {
  buildLowStockReason,
  buildSuggestedReorderQuantity,
  calculateNextOnHand,
  isLowStock,
} from './inventory';

describe('inventory service helpers', () => {
  it('calculates repeated receives and consumes consistently', () => {
    let onHand = 0;
    onHand = calculateNextOnHand(onHand, 10);
    onHand = calculateNextOnHand(onHand, -2.5);
    onHand = calculateNextOnHand(onHand, 1.25);

    expect(onHand).toBe(8.75);
  });

  it('detects low stock and suggests reorder quantity', () => {
    const item = {
      onHand: 1,
      reorderPoint: 3,
      reorderQuantity: 5,
      active: true,
    };

    expect(isLowStock(item)).toBe(true);
    expect(buildSuggestedReorderQuantity(item)).toBe(5);
    expect(buildLowStockReason(item)).toContain('On hand 1');
  });

  it('falls back to deficit when reorder quantity is unset', () => {
    const item = {
      onHand: 2,
      reorderPoint: 6,
      reorderQuantity: 0,
      active: true,
    };

    expect(buildSuggestedReorderQuantity(item)).toBe(4);
  });
});
