import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GUARD: the shell owns the reading column; `PageBody` owns the gutter. Never both.
 *
 * efd-admin has never had a page frame — `AppShell` rendered a bare `<Box component="main" sx={{flex:1}}>`
 * — so each of 384 screens picked its own padding, and they disagree: `p: 3` 32 times, `p: 4` 22, `p: 2`
 * 13, `p: 1.5` 9, `p: 6` 7. That is why the left edge and the vertical rhythm move as you navigate.
 *
 * The fix is split in two because doing it in one go would double every gutter in the app on the same
 * commit. The shell centres every screen in one maximum width — safe, because no page sets that for
 * itself. The gutter and the vertical rhythm live in `PageBody`, which screens adopt a segment at a time
 * as each drops its own padding.
 *
 * So: adding padding to the shell's `<main>` is the mistake this guards against, and it would not look
 * like a mistake — it would look like finishing the job.
 */
const COMPONENTS = path.resolve(__dirname);
const APP_SHELL = path.join(COMPONENTS, 'AppShell.js');
const KIT = path.join(COMPONENTS, 'facelift', 'index.js');
const KIT_CSS = path.join(COMPONENTS, 'facelift', 'facelift.module.css');

/** The `sx` object on the shell's `<main>`, as written. */
function mainSx() {
  const text = fs.readFileSync(APP_SHELL, 'utf8');
  const at = text.indexOf('component="main"');
  expect(at, 'AppShell still renders a <main>').toBeGreaterThan(-1);
  const open = text.indexOf('sx={{', at);
  const close = text.indexOf('}}', open);
  return text.slice(open, close + 2);
}

describe('the page frame', () => {
  it('centres every screen in one reading column', () => {
    const sx = mainSx();
    expect(sx).toMatch(/maxWidth:\s*\d+/);
    expect(sx).toMatch(/mx:\s*'auto'/);
  });

  it('does NOT put the gutter on the shell, which would double it on every page at once', () => {
    const sx = mainSx();
    expect(sx).not.toMatch(/\bp(?:[xytblr])?:\s/);
    expect(sx).not.toMatch(/\bpadding/);
  });

  it('keeps PageBody as the one home for the gutter and the rhythm', () => {
    const kit = fs.readFileSync(KIT, 'utf8');
    const css = fs.readFileSync(KIT_CSS, 'utf8');

    expect(kit).toMatch(/export function PageBody\b/);
    // It is a <main>, so a screen that adopts it is the page's landmark, not another div.
    expect(kit).toMatch(/<main\b/);

    const rule = css.slice(css.indexOf('.pageBody {'), css.indexOf('}', css.indexOf('.pageBody {')));
    expect(rule, 'PageBody carries the gutter').toMatch(/padding:/);
    expect(rule, 'PageBody carries the vertical rhythm').toMatch(/gap:/);
    expect(rule, 'PageBody carries the column too, for when it is the outermost frame').toMatch(/max-width:/);
  });
});
