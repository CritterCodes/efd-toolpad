import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GUARD: one home for a row of a page's views, and the count of MUI tab rows only goes down.
 *
 * Two files had independently written the same patch — `'& .MuiTabs-scroller': { overflowX: 'auto
 * !important' }` — because the row pushes the page sideways on a phone otherwise. Both are converted;
 * that is the easy half.
 *
 * The harder half is `scrollButtons`, which **11 files** pass. It reads like the overflow is handled, and
 * on a touch screen it is not: MUI does not render scroll buttons there, so on My Bench and Payment &
 * Pickup the last lanes were reachable only by a swipe with nothing on screen suggesting one existed. A
 * prop that silently does nothing is worse than no prop, because it stops anyone looking further.
 *
 * `TabRail` fades whichever edge has more to show, scrolls the active pill into view, and sits at 44px on
 * a coarse pointer. These are ratchets: both constants may only ever go down.
 */
const SRC = path.resolve(__dirname, '../..');
const KIT = path.join(__dirname, 'index.js');

// Counts after converting My Bench and Payment & Pickup. Lower them as screens convert; never raise.
const MAX_SCROLLER_PATCHES = 0;
const MAX_SCROLL_BUTTONS = 9;

function sourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.') || entry.name === 'graphify-out') continue;
      sourceFiles(full, out);
    } else if (/\.(m?js|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

/** Files matching `needle`, excluding the kit itself — it names both in its own explanation. */
function offenders(needle) {
  return sourceFiles(SRC)
    .filter((f) => f !== KIT && needle.test(fs.readFileSync(f, 'utf8')))
    .map((f) => path.relative(SRC, f).replace(/\\/g, '/'));
}

const scrollerPatches = () => offenders(/MuiTabs-scroller/);
const scrollButtons = () => offenders(/\bscrollButtons\b/);

describe("a row of a page's views", () => {
  it('has one home in the kit', () => {
    const kit = fs.readFileSync(KIT, 'utf8');
    const css = fs.readFileSync(path.join(__dirname, 'facelift.module.css'), 'utf8');

    expect(kit).toMatch(/export function TabRail\b/);
    // The track scrolls; the page never does.
    expect(css).toMatch(/\.rail\s*\{[^}]*overflow-x:\s*auto/);
    // The affordance MUI's scroll buttons never provided on touch.
    expect(css).toMatch(/\.railFadeEnd::after\s*\{\s*opacity:\s*1/);
    // The bench is used with gloved hands.
    expect(css).toMatch(/pointer:\s*coarse[\s\S]{0,140}min-height:\s*44px/);
  });

  it('nobody hand-patches the MUI scroller', () => {
    const found = scrollerPatches();
    expect(found, `hand-patched MuiTabs-scroller in:\n  ${found.join('\n  ')}`).toHaveLength(MAX_SCROLLER_PATCHES);
  });

  it('the scrollButtons count only goes down', () => {
    const found = scrollButtons();
    expect(
      found.length,
      `scrollButtons (which never renders on touch) in:\n  ${found.join('\n  ')}\nConvert one to TabRail and lower MAX_SCROLL_BUTTONS.`,
    ).toBeLessThanOrEqual(MAX_SCROLL_BUTTONS);
  });

  it('keeps the ratchet honest', () => {
    // If the count has dropped, the constant drops with it, or the guard stops biting.
    expect(
      scrollButtons().length,
      'fewer than the ratchet allows — lower MAX_SCROLL_BUTTONS to match',
    ).toBe(MAX_SCROLL_BUTTONS);
  });

  it('the two screens converted here use neither', () => {
    const both = [...scrollerPatches(), ...scrollButtons()];
    expect(both).not.toContain('app/dashboard/repairs/my-bench/page.js');
    expect(both).not.toContain('app/dashboard/repairs/pick-up/page.js');
  });
});
