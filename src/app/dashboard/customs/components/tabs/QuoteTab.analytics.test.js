// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { AnalyticsCard } from './QuoteTab';

/**
 * THE MARGIN FLOOR AFTER THE CENTRE-STONE SPLIT.
 *
 * Giving the centre stone its own markup put a pass-through line in the denominator of a threshold
 * calibrated for keystone on everything. The owner's first natural-diamond ring — $4,000 stone at 1.3×
 * inside a $1,000 ring at 2.5× — blends to 35.1% and tripped the 45% floor, flagging a quote whose
 * actual work margin is 60%. A warning that fires on every stone sale is one nobody reads, which is
 * what costs us the cases it should catch.
 *
 * The floor now judges the marked-up portion. These tests assert the RENDERED output, because the
 * failure mode last time was arithmetic that was right in a function nobody had wired to the props —
 * `workRevenue` was undefined at the call site, `undefined > 0` was false, and the whole mechanism
 * silently collapsed back to the blended figure it was written to replace. Only the comment shipped.
 * Reading the DOM is the only check that can't pass in that state.
 */

const FLOOR = 45;

// The owner's ring: stone 4000 @1.3 = 5200, ring cog 1000 @2.5 = 2500.
const RING = { cog: 5000, total: 7700, workRevenue: 2500, workCog: 1000 };

const view = (props) => render(
  <AnalyticsCard cog={0} total={0} designerPayout={0} margin={null} bonus={0} floorPct={FLOOR} {...props} />,
);
const warned = () => screen.queryByText(new RegExp(`below ${FLOOR}% floor`, 'i'));

afterEach(cleanup);

describe('AnalyticsCard margin floor', () => {
  it('does NOT warn on the correctly-priced diamond ring (the false alarm that started this)', () => {
    view(RING);
    expect(warned()).toBeNull();
  });

  it('shows the work margin next to the blend, so the 35% figure is explained rather than alarming', () => {
    view(RING);
    expect(screen.getByText('35.1%')).toBeTruthy();            // blended, informational
    expect(screen.getByText(/Margin on EFD's work/)).toBeTruthy();
    expect(screen.getByText('60.0%')).toBeTruthy();            // what the floor actually judges
  });

  it('STILL warns when the ring itself is underpriced, stone or no stone', () => {
    // Same $4,000 stone, but the ring marked up only 1.2× → work margin 16.7%.
    view({ cog: 5000, total: 6400, workRevenue: 1200, workCog: 1000 });
    expect(warned()).toBeTruthy();
    expect(screen.getByText(/16\.7%/)).toBeTruthy();
  });

  it('is unchanged on a plain keystone job: one margin row, no work row, no warning', () => {
    view({ cog: 1000, total: 2500, workRevenue: 2500, workCog: 1000 });
    expect(warned()).toBeNull();
    expect(screen.queryByText(/Margin on EFD's work/)).toBeNull();  // nothing to explain
    expect(screen.getByText('60.0%')).toBeTruthy();
  });

  it('is unchanged on a plain job priced under the floor: still warns', () => {
    view({ cog: 1000, total: 1500, workRevenue: 1500, workCog: 1000 });
    expect(warned()).toBeTruthy();
  });

  it('rush on the ring alone does not create a false alarm', () => {
    // 1.5× rush applied to the ring only: 2500 × 1.5 = 3750, stone untouched at 5200.
    view({ cog: 5000, total: 8950, workRevenue: 3750, workCog: 1000 });
    expect(warned()).toBeNull();
    expect(screen.getByText('73.3%')).toBeTruthy();
  });

  it('falls back to the blended margin when the work props are absent, and still judges SOMETHING', () => {
    // Defensive: an unwired call site must not silently disable the floor entirely.
    view({ cog: 1000, total: 1500 });
    expect(warned()).toBeTruthy();
  });
});

/**
 * The tests above render AnalyticsCard directly, so by construction they CANNOT catch the defect that
 * actually happened: the props existed, the arithmetic was right, and the call site passed neither —
 * `undefined > 0` is false, so it silently fell back to the blend it was written to replace, and even
 * the explanatory row went missing because `blendDiffers` compared a number to itself.
 *
 * Rendering the whole tab to catch that would mean standing up an order, the settings fetch and MUI.
 * Reading the source is a narrower check with an honest name: it asserts the wiring exists, nothing
 * about what it computes. The rest of this file covers that.
 */
describe('the call site is actually wired', () => {
  it('passes workRevenue and workCog to AnalyticsCard', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    // Not import.meta.url — under jsdom that's an http URL and readFileSync rejects it.
    const src = fs.readFileSync(
      path.join(process.cwd(), 'src/app/dashboard/customs/components/tabs/QuoteTab.js'),
      'utf8',
    );
    const call = src.match(/<AnalyticsCard[^/]*\/>/s);
    expect(call, 'no <AnalyticsCard .../> call site found').toBeTruthy();
    expect(call[0]).toMatch(/workRevenue=\{/);
    expect(call[0]).toMatch(/workCog=\{/);
  });
});
