import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GUARD: gold is the one thing to do next, not an accent.
 *
 * DESIGN.md: *"One gold per view. If two things are gold, one of them is wrong."* and *"Gold is never a
 * decorative fill."* Measured on the real dashboard, signed in, 2026-10-02: **10 gold elements above the
 * fold inside `<main>`** — four gold contained buttons in one card (`Payroll`, `Connect Stripe`,
 * `Settings`, `Settings`), a gold text button, a gold progress bar, a gold ring on every unfinished row,
 * and three gold icon tiles. Gold had stopped meaning anything.
 *
 * Meanwhile My Bench — the signature bench screen — had **no** gold in its content at all. The screen
 * that should say "do this next" didn't, and the dashboard said it ten times.
 *
 * This is a source guard rather than a runtime one because the count depends on data (how many checklist
 * steps are unfinished), and the rule it is really protecting is structural: the gold treatment in the
 * Getting Started card must be conditional on being the NEXT step, and the repeated chrome — icon tiles,
 * "Open" links, progress bars — must not be gold at all.
 */
const GUIDE = path.resolve(__dirname);
const CARD = path.join(GUIDE, 'GettingStartedCard.js');
const PARTS = path.resolve(__dirname, '../../app/dashboard/adminDashboardParts.js');

const read = (p) => fs.readFileSync(p, 'utf8');

describe('gold on the dashboard', () => {
  it('marks only the next step, not every unfinished one', () => {
    const card = read(CARD);
    // The card already knows which step is next; the treatment has to depend on it.
    expect(card).toMatch(/const isNext = item\.id === next\?\.id/);
    expect(card).toMatch(/variant=\{isNext \? 'contained' : 'outlined'\}/);
    expect(card).toMatch(/isNext \? facelift\.gold/);
  });

  it('does not wear a side-stripe', () => {
    // DESIGN.md, Don't: "use a side-stripe border as decoration". `accent` on SurfaceCard is that stripe.
    expect(read(CARD)).not.toMatch(/<SurfaceCard[^>]*\baccent=/);
  });

  it('spends no gold on repeated chrome', () => {
    const parts = read(PARTS);

    /** One exported function's body — bounded by the next `export`, so a later function's gold is not read as this one's. */
    const fn = (name) => {
      const from = parts.indexOf(`export function ${name}`);
      expect(from, `${name} is still in adminDashboardParts`).toBeGreaterThan(-1);
      const next = parts.indexOf('\nexport ', from + 1);
      return parts.slice(from, next === -1 ? undefined : next);
    };

    // These repeat: one icon tile per stat card and per queue row, one "Open" per row, one bar per card.
    // Gold on any of them is spent before the reader reaches an action.
    expect(fn('IconTile'), 'the icon tile is neutral').not.toMatch(/facelift\.gold/);
    expect(fn('OpenLink'), 'the Open link is neutral').not.toMatch(/facelift\.gold/);
    expect(fn('StatCard'), 'the progress bar is neutral').not.toMatch(/facelift\.gold/);

    // `PriorityNotice` and `statusHue` keep theirs on purpose: a rush job and a finished job are both
    // "your turn" states, which is exactly what DESIGN.md reserves gold for.
  });

  it('leaves the progress bar and the quiet buttons alone', () => {
    const card = read(CARD);
    expect(card).toMatch(/MuiLinearProgress-bar': \{ bgcolor: facelift\.text2 \}/);
    // "How EFD works" and "Hide for now" are both secondary; neither is the answer to "what now".
    expect(card).not.toMatch(/How EFD works<\/Button>[\s\S]{0,40}facelift\.gold/);
  });
});
