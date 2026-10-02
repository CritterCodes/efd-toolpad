// @vitest-environment jsdom
//
// GUARD: gold on the artisan applications screen marks the one thing to do next.
//
// The four stat cards had coloured **left side-stripes** — the decoration DESIGN.md names in its Don't
// list, and the shape `/dashboard` was cleaned of in #260 — each with its number in the stripe's colour.
// Two of the four stripes were gold, because `primary.main` and `warning.main` are *both* `#FBBF24` in
// this theme, so the screen spent gold twice on counts before the reader reached an applicant.
//
// The rule now: gold goes to Pending Review, and only when something is actually pending. Nothing waiting
// means nothing gold — the same conditional shape as `isNext` on the Getting Started card.
//
// Measuring this in a browser only ever answers it for the data that happened to be seeded. `views.check`
// has zero pending applications, so a browser can show that nothing is gold and can never show that
// something *becomes* gold. Both halves matter, so both are rendered here.
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { StatsCards } from './ArtisanApplicationsManagement';

const show = (stats) => render(<StatsCards stats={stats} />);

/** The element carrying a figure's value, found by its text. */
const figure = (value) => screen.getByText(String(value));

/** `Figure` marks an accented value with its own class; that is the gold. */
const isGold = (el) => /figureValueAccent/.test(el.className);

afterEach(cleanup);

describe('gold on artisan applications', () => {
  it('spends none when nothing is pending', () => {
    show({ total: 2, pending: 0, approved: 2, rejected: 0 });
    // Three zeros and a two: whichever element each is, none of them may be accented.
    for (const el of document.querySelectorAll('[class*=figureValue]')) {
      expect(isGold(el), `${el.textContent} is not gold`).toBe(false);
    }
  });

  it('marks Pending Review, and only it, when something is waiting', () => {
    show({ total: 5, pending: 3, approved: 1, rejected: 1 });
    const gold = [...document.querySelectorAll('[class*=figureValue]')].filter(isGold);
    expect(gold).toHaveLength(1);
    expect(gold[0]).toHaveTextContent('3');
  });

  it('wears no side-stripe, whatever the counts', () => {
    const { container } = show({ total: 5, pending: 3, approved: 1, rejected: 1 });
    for (const el of container.querySelectorAll('*')) {
      // A stripe is a left border thicker than the others. The kit's card border is 1px all round.
      const { borderLeftWidth, borderTopWidth } = el.style;
      if (borderLeftWidth && borderTopWidth) {
        expect(parseFloat(borderLeftWidth)).toBeLessThanOrEqual(parseFloat(borderTopWidth));
      }
    }
    // The kit's own stripe is opt-in through `accent` on SurfaceCard, and nothing here passes it.
    expect(container.querySelectorAll('[class*=cardAccented]')).toHaveLength(0);
  });

  it('still shows every count, including the zeroes', () => {
    show({ total: 5, pending: 0, approved: 4, rejected: 1 });
    expect(figure(5)).toBeInTheDocument();
    expect(figure(4)).toBeInTheDocument();
    expect(figure(1)).toBeInTheDocument();
    expect(screen.getByText('Pending Review')).toBeInTheDocument();
  });

  it('reads a missing count as zero rather than blank', () => {
    show({});
    expect(document.querySelectorAll('[class*=figureValue]')).toHaveLength(4);
    expect(screen.getAllByText('0')).toHaveLength(4);
  });
});
