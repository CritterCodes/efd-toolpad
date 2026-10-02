import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GUARD: exactly one gutter, and one place that owns the vertical rhythm.
 *
 * **Corrected 2026-10-02.** The first version of this file asserted that `PageBody` carries the gutter,
 * because `AppShell` rendered a bare `<Box component="main" sx={{ flex: 1 }}>` and it looked like nothing
 * supplied one. Something does, one component further in: `RoleAwareLayout` wraps every dashboard page in
 * `px: { xs: 2, md: 3 }, py: 2`. So a screen adopting `PageBody` inside the dashboard would have been
 * indented twice — a trap built by the very change meant to end inconsistent indentation.
 *
 * What the dashboard genuinely lacks is the vertical rhythm: sections are spaced by `mb: 2` / `mb: 3` on
 * nearly every heading, each screen choosing its own. That is what `PageBody` carries.
 *
 * So the three things worth pinning are: the shell owns the reading column, the dashboard gutter has
 * exactly one home, and `PageBody` adds no second one by default.
 */
const COMPONENTS = path.resolve(__dirname);
const APP_SHELL = path.join(COMPONENTS, 'AppShell.js');
const ROLE_LAYOUT = path.join(COMPONENTS, 'RoleAwareLayout.js');
const KIT = path.join(COMPONENTS, 'facelift', 'index.js');
const KIT_CSS = path.join(COMPONENTS, 'facelift', 'facelift.module.css');

const read = (p) => fs.readFileSync(p, 'utf8');

/** The `sx` object on the shell's `<main>`, as written. */
function mainSx() {
  const text = read(APP_SHELL);
  const at = text.indexOf('component="main"');
  expect(at, 'AppShell still renders a <main>').toBeGreaterThan(-1);
  const open = text.indexOf('sx={{', at);
  return text.slice(open, text.indexOf('}}', open) + 2);
}

/** One CSS rule body by class name. */
function cssRule(name) {
  const css = read(KIT_CSS);
  const at = css.indexOf(`.${name} {`);
  expect(at, `.${name} exists`).toBeGreaterThan(-1);
  return css.slice(at, css.indexOf('}', at));
}

describe('the page frame', () => {
  it('centres every screen in one reading column, on the shell', () => {
    const sx = mainSx();
    expect(sx).toMatch(/maxWidth:\s*\d+/);
    expect(sx).toMatch(/mx:\s*'auto'/);
  });

  it('keeps the gutter in exactly one place', () => {
    // RoleAwareLayout has always supplied it for the dashboard. The shell must not add a second...
    expect(read(ROLE_LAYOUT)).toMatch(/px:\s*\{[^}]*xs:/);
    expect(mainSx()).not.toMatch(/\bp(?:[xytblr])?:\s|\bpadding/);

    // ...and neither must PageBody, or a screen adopting it is indented twice.
    const body = cssRule('pageBody');
    expect(body).not.toMatch(/padding-left|padding-right|padding:/);
    expect(body, 'bottom padding is fine — it clears the floating action bar').toMatch(/padding-bottom:/);
  });

  it('offers the gutter only where nothing else supplies one', () => {
    // Auth, print and the error pages sit outside the dashboard shell and have no wrapper.
    expect(cssRule('pageBodyGutter')).toMatch(/padding-left:/);
    expect(read(KIT)).toMatch(/gutter = false/);
  });

  it('owns the vertical rhythm, which is the part that was actually missing', () => {
    const body = cssRule('pageBody');
    expect(body).toMatch(/gap:/);
    expect(body).toMatch(/flex-direction:\s*column/);
    expect(read(KIT_CSS)).toMatch(/\.pageBody > :first-child \{ margin-top: 0/);
  });

  it('is not a second <main>', () => {
    // AppShell already renders the page's one landmark; two would be invalid.
    const kit = read(KIT);
    const fn = kit.slice(kit.indexOf('export function PageBody'));
    expect(fn.slice(0, fn.indexOf('}\n'))).toMatch(/as: Tag = 'div'/);
  });
});
