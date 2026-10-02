import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GUARD: one home for a row of a page's views, and neither of the two broken patterns comes back.
 *
 * Two files had independently written the same patch — `'& .MuiTabs-scroller': { overflowX: 'auto
 * !important' }` — because the row pushes the page sideways on a phone otherwise. That was the easy half.
 *
 * The harder half was `scrollButtons`, which **11 files** passed. It reads like the overflow is handled,
 * and on a touch screen it is not: MUI does not render scroll buttons there, so on My Bench and Payment &
 * Pickup the last lanes were reachable only by a swipe with nothing on screen suggesting one existed. A
 * prop that silently does nothing is worse than no prop, because it stops anyone looking further.
 *
 * `TabRail` fades whichever edge has more to show, scrolls the active pill into view, and sits at 44px on
 * a coarse pointer. Both counts reached 0 on 2026-10-02, so the ratchets are now bans: a new occurrence of
 * either means a row of views was written by hand again, and the right answer is `TabRail`.
 *
 * A third count tracks what is left. `scrollButtons` was the *broken* half — a prop that silently does
 * nothing on touch. The rest of the hand-written rows are merely hand-written, and some are worse than they
 * look: an artisan's profile header renders four `<Tab>`s with no scroll variant at all, so on a phone MUI
 * squeezes them and the fourth is unreachable. That count is a ratchet, not yet a ban.
 */
const SRC = path.resolve(__dirname, '../..');
const KIT = path.join(__dirname, 'index.js');

// 11 at the start, 9 after My Bench and Payment & Pickup, 6 after Wholesale Management, Customs and
// Drops, 0 after the guide, admin settings, materials, lead fit views, one custom order and one design.
const MAX_SCROLLER_PATCHES = 0;
const MAX_SCROLL_BUTTONS = 0;
// Rows still rendered with MUI's own <Tabs>. 19 when the ban landed; 16 after the three profile headers.
const MAX_MUI_TAB_ROWS = 16;

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
const railUsers = () => offenders(/\bTabRail\b/);
const muiTabRows = () => offenders(/<Tabs[\s>]/);

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

  it('nobody passes scrollButtons, which never renders on touch', () => {
    const found = scrollButtons();
    expect(
      found.length,
      `scrollButtons in:\n  ${found.join('\n  ')}\nUse TabRail — it fades the overflowing edge on every pointer.`,
    ).toBe(MAX_SCROLL_BUTTONS);
  });

  it('the count of hand-written rows only goes down', () => {
    const found = muiTabRows();
    expect(
      found.length,
      `MUI <Tabs> in:\n  ${found.join('\n  ')}\nConvert one to TabRail and lower MAX_MUI_TAB_ROWS.`,
    ).toBeLessThanOrEqual(MAX_MUI_TAB_ROWS);
  });

  it('keeps that ratchet honest', () => {
    expect(
      muiTabRows().length,
      'fewer than the ratchet allows — lower MAX_MUI_TAB_ROWS to match',
    ).toBe(MAX_MUI_TAB_ROWS);
  });

  it('is adopted, not merely available', () => {
    // A kit component nothing imports is a component that drifts. Lower this only if a screen is deleted.
    expect(railUsers().length, 'screens using TabRail').toBeGreaterThanOrEqual(11);
  });
});
