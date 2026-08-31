import { describe, it, expect } from 'vitest';
import { alignTasksToMetal, taskAllowsMetal, metalCounterpartFor } from './metalTaskFilter';

/**
 * The deterministic guard between AI task matching and the intake form. The AI
 * works from text, so "size down this platinum band" can match the gold-solder
 * task — these rules are what make the platinum catalog actually get USED, and
 * what keeps platinum tasks off gold jobs.
 */

const goldSizeDown = { _id: 'g1', title: 'Size Down' };
const goldHalfSmall = { _id: 'g2', title: 'Half-Shank — up to 3mm' };
const goldHalfLarge = { _id: 'g3', title: 'Half-Shank — 3 to 5mm' };
const cleanPolish = { _id: 'g4', title: 'Clean and Polish' };
const ptSizeDown = { _id: 'p1', title: 'Size Down — Platinum (laser welded)', metals: ['platinum'] };
const ptHalfSmall = { _id: 'p2', title: 'Half-Shank — Platinum, up to 3mm (laser welded)', metals: ['platinum'] };
const ptHalfLarge = { _id: 'p3', title: 'Half-Shank — Platinum, 3 to 5mm (laser welded)', metals: ['platinum'] };

const CATALOG = [goldSizeDown, goldHalfSmall, goldHalfLarge, cleanPolish, ptSizeDown, ptHalfSmall, ptHalfLarge];

describe('taskAllowsMetal', () => {
  it('unrestricted tasks allow everything, including unknown', () => {
    expect(taskAllowsMetal(goldSizeDown, 'platinum')).toBe(true);
    expect(taskAllowsMetal(goldSizeDown, '')).toBe(true);
  });
  it('a platinum task allows only platinum — and never an unknown metal', () => {
    expect(taskAllowsMetal(ptSizeDown, 'platinum')).toBe(true);
    expect(taskAllowsMetal(ptSizeDown, 'gold')).toBe(false);
    expect(taskAllowsMetal(ptSizeDown, '')).toBe(false);
  });
});

describe('alignTasksToMetal — the platinum job', () => {
  it('SWAPS a generic match for its platinum counterpart', () => {
    const out = alignTasksToMetal([goldSizeDown], 'platinum', CATALOG);
    expect(out).toEqual([ptSizeDown]);
  });

  it('size qualifiers pick the right sibling, not the other width', () => {
    expect(alignTasksToMetal([goldHalfSmall], 'platinum', CATALOG)).toEqual([ptHalfSmall]);
    expect(alignTasksToMetal([goldHalfLarge], 'platinum', CATALOG)).toEqual([ptHalfLarge]);
  });

  it('a task with no platinum counterpart passes through unchanged', () => {
    expect(alignTasksToMetal([cleanPolish], 'platinum', CATALOG)).toEqual([cleanPolish]);
  });

  it('swap + passthrough compose, without duplicates', () => {
    const out = alignTasksToMetal([goldSizeDown, ptSizeDown, cleanPolish], 'platinum', CATALOG);
    expect(out).toEqual([ptSizeDown, cleanPolish]);
  });
});

describe('alignTasksToMetal — the gold job', () => {
  it('lands a stray platinum match back on the generic task', () => {
    // The AI matched the platinum task for a gold ring (titles are similar) —
    // the work item survives, on the right recipe.
    const out = alignTasksToMetal([ptHalfSmall], 'gold', CATALOG);
    expect(out).toEqual([goldHalfSmall]);
  });

  it('gold matches stay exactly as matched', () => {
    const out = alignTasksToMetal([goldSizeDown, goldHalfLarge], 'gold', CATALOG);
    expect(out).toEqual([goldSizeDown, goldHalfLarge]);
  });
});

describe('alignTasksToMetal — unknown metal', () => {
  it('never auto-selects a restricted task without a metal signal', () => {
    const out = alignTasksToMetal([ptSizeDown], '', CATALOG);
    // lands on the generic sibling — the safe default when the metal is unstated
    expect(out).toEqual([goldSizeDown]);
  });
  it('generic tasks pass through untouched', () => {
    expect(alignTasksToMetal([goldSizeDown, cleanPolish], '', CATALOG)).toEqual([goldSizeDown, cleanPolish]);
  });
});

describe('metalCounterpartFor', () => {
  it('returns null on a tie rather than guessing', () => {
    const ambiguous = { _id: 'x', title: 'Half-Shank' }; // matches both widths equally
    expect(metalCounterpartFor(ambiguous, 'platinum', CATALOG)).toBeNull();
  });
});
