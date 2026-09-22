import { describe, it, expect } from 'vitest';
import { DEFAULT_LADDER, normalizeLadder, ladderFromSettings, resolvePayRate, tierByKey } from './payLadder';

describe('normalizeLadder', () => {
  it('accepts the defaults unchanged', () => {
    const l = normalizeLadder(DEFAULT_LADDER);
    expect(l.tiers.map((t) => t.key)).toEqual(['apprentice', 'bench-jeweler', 'senior-jeweler', 'master']);
    expect(l.tiers[1].rate).toBe(30);
  });

  it('slugs keys from labels, splits textarea requirements, rounds rates', () => {
    const l = normalizeLadder({ tiers: [{ label: 'Bench Jeweler II', rate: '32.499', requirements: 'a\n\n b \n' }] });
    expect(l.tiers[0]).toEqual({ key: 'bench-jeweler-ii', label: 'Bench Jeweler II', rate: 32.5, summary: '', requirements: ['a', 'b'] });
  });

  it('rejects empty, duplicate, and zero-rate tiers', () => {
    expect(() => normalizeLadder({ tiers: [] })).toThrow(/at least one/);
    expect(() => normalizeLadder({ tiers: [{ label: 'A', rate: 1 }, { label: 'a', rate: 2 }] })).toThrow(/Duplicate/);
    expect(() => normalizeLadder({ tiers: [{ label: 'A', rate: 0 }] })).toThrow(/above zero/);
  });

  it('ladderFromSettings falls back to defaults on a missing or broken block', () => {
    expect(ladderFromSettings(null).tiers.length).toBe(4);
    expect(ladderFromSettings({ payLadder: { tiers: [{ label: '', rate: 5 }] } }).tiers.length).toBe(4);
    expect(ladderFromSettings({ payLadder: { tiers: [{ label: 'Only', rate: 40 }] } }).tiers).toEqual([{ key: 'only', label: 'Only', rate: 40, summary: '', requirements: [] }]);
  });
});

describe('resolvePayRate', () => {
  const ladder = normalizeLadder(DEFAULT_LADDER);

  it('never placed → shop rate (the pre-ladder behavior, so the owner is unchanged)', () => {
    expect(resolvePayRate({}, ladder, 50)).toEqual({ rate: 50, source: 'shop', tierKey: '', tierLabel: '' });
    expect(resolvePayRate({ employment: { isOnsite: true } }, ladder, 50).source).toBe('shop');
  });

  it('tier only → tier rate', () => {
    expect(resolvePayRate({ employment: { payTier: 'bench-jeweler' } }, ladder, 50)).toEqual({ rate: 30, source: 'tier', tierKey: 'bench-jeweler', tierLabel: 'Bench jeweler' });
  });

  it('explicit rate equal to the tier → tier; different → custom (a negotiated override)', () => {
    expect(resolvePayRate({ employment: { payTier: 'bench-jeweler', hourlyRate: 30 } }, ladder, 50).source).toBe('tier');
    const custom = resolvePayRate({ employment: { payTier: 'bench-jeweler', hourlyRate: 33 } }, ladder, 50);
    expect(custom).toEqual({ rate: 33, source: 'custom', tierKey: 'bench-jeweler', tierLabel: 'Bench jeweler' });
  });

  it('explicit rate with no tier → custom; equal to the shop rate → shop (pre-ladder default); unknown tier key is ignored', () => {
    expect(resolvePayRate({ employment: { hourlyRate: 27 } }, ladder, 50)).toEqual({ rate: 27, source: 'custom', tierKey: '', tierLabel: '' });
    expect(resolvePayRate({ employment: { isOnsite: true, hourlyRate: 50 } }, ladder, 50)).toEqual({ rate: 50, source: 'shop', tierKey: '', tierLabel: '' });
    expect(resolvePayRate({ employment: { payTier: 'nope' } }, ladder, 50).source).toBe('shop');
    expect(tierByKey(ladder, 'nope')).toBeNull();
  });
});
