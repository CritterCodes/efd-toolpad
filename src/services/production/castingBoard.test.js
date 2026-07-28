import { describe, expect, it } from 'vitest';
import {
  castingChargeFromCost, splitCastingCost, disputeDeadlineFrom, isPastDisputeWindow, canTransition,
} from '@/services/production/castingBoard';

describe('castingChargeFromCost (pure — charge = cost × wholesale markup multiplier)', () => {
  it('multiplies cost by the wholesale markup multiplier from settings', () => {
    expect(castingChargeFromCost(100, 1.5)).toBe(150);   // default wholesale markup 1.5×
    expect(castingChargeFromCost(100, 1.2)).toBe(120);   // if the setting were 1.2×
    expect(castingChargeFromCost(80, 1.5)).toBe(120);
  });
  it('defaults to the settings default (1.5) when no multiplier passed', () => {
    expect(castingChargeFromCost(100)).toBe(150);
  });
  it('handles zero/garbage safely', () => {
    expect(castingChargeFromCost(0, 1.5)).toBe(0);
    expect(castingChargeFromCost(null, 1.5)).toBe(0);
  });
});

describe('splitCastingCost (pure)', () => {
  it('splits evenly and the parts sum EXACTLY to the total', () => {
    const parts = splitCastingCost(100, 3);
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe(33.33);
    expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(100, 2);   // 33.33+33.33+33.34
    expect(parts[2]).toBe(33.34);   // remainder on the last piece
  });
  it('single piece gets the whole cost', () => {
    expect(splitCastingCost(250, 1)).toEqual([250]);
  });
  it('never divides by zero', () => {
    expect(splitCastingCost(50, 0)).toEqual([50]);
  });
});

describe('dispute window (pure)', () => {
  it('deadline is 48h after delivery by default', () => {
    const delivered = new Date('2026-07-24T00:00:00Z');
    expect(disputeDeadlineFrom(delivered).toISOString()).toBe('2026-07-26T00:00:00.000Z');
  });
  it('isPastDisputeWindow flips exactly at the deadline', () => {
    const batch = { disputeDeadline: new Date('2026-07-26T00:00:00Z') };
    expect(isPastDisputeWindow(batch, new Date('2026-07-25T23:59:59Z'))).toBe(false);
    expect(isPastDisputeWindow(batch, new Date('2026-07-26T00:00:00Z'))).toBe(true);
  });
  it('no deadline → never past window', () => {
    expect(isPastDisputeWindow({}, new Date())).toBe(false);
  });
});

describe('canTransition (pure lifecycle)', () => {
  it('allows the forward path', () => {
    expect(canTransition('needs_ordering', 'ordered')).toBe(true);
    expect(canTransition('ordered', 'received')).toBe(true);
    expect(canTransition('received', 'delivered')).toBe(true);
    expect(canTransition('delivered', 'accepted')).toBe(true);
    expect(canTransition('delivered', 'disputed')).toBe(true);
  });
  it('forbids skips and moves out of terminal states', () => {
    expect(canTransition('needs_ordering', 'received')).toBe(false);   // can't skip ordering
    expect(canTransition('needs_ordering', 'delivered')).toBe(false);
    expect(canTransition('accepted', 'ordered')).toBe(false);          // terminal
    expect(canTransition('cancelled', 'ordered')).toBe(false);
  });
  it('a disputed casting can be re-ordered or resolved', () => {
    expect(canTransition('disputed', 'ordered')).toBe(true);
    expect(canTransition('disputed', 'accepted')).toBe(true);
  });
});
