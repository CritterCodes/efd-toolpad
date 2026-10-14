import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * A ROUTE STATE SITS IN THE MIDDLE OF THE SPACE IT WAS GIVEN.
 *
 * `.statePage` — what `ErrorPage` and `NotFoundPage` render into — had `max-width: 640px` and no margin,
 * so the column pinned to the left edge. Seen on the real 404 at 1024×768 on 2026-10-14: "That page is
 * not here" sat in the top-left corner with ~380px of empty black beside it and ~700px below. It read as
 * a page that had failed to finish loading rather than one telling you something, which is the opposite
 * of what an error state is for — these are the screens someone meets when something has already gone
 * wrong, and looking broken compounds it.
 *
 * `min-height` is 60vh rather than 100vh deliberately: a route's `error.js` renders INSIDE the dashboard
 * shell, under its header and beside its nav, and a full-viewport box there pushes itself off the bottom
 * of the screen. 60vh centres acceptably in both places.
 *
 * Verified in a browser at both widths after the change:
 *   1024×768 — 192px of gap either side, no horizontal scroll
 *   375×812  — no horizontal or vertical scroll, 44px action, content optically centred
 */
const CSS = path.join(process.cwd(), 'src', 'components', 'facelift', 'facelift.module.css');

/** The declarations of the first rule whose selector list contains `.name` and is not a media override. */
function rule(name) {
  const css = fs.readFileSync(CSS, 'utf8');
  const at = css.indexOf(`.${name} {`);
  expect(at, `.${name} has no rule`).toBeGreaterThan(-1);
  return css.slice(at, css.indexOf('}', at));
}

describe('route states', () => {
  it('centres its column rather than pinning it to the left edge', () => {
    const body = rule('statePage');
    expect(body, 'a capped width with no auto margin leaves the text in the corner').toMatch(/margin-inline:\s*auto/);
    expect(body).toMatch(/max-width:\s*\d+px/);
  });

  it('fills enough height to look deliberate, without claiming the viewport', () => {
    const body = rule('statePage');
    const m = /min-height:\s*(\d+)vh/.exec(body);
    expect(m, 'without a min-height the content hugs the top of a tall empty page').not.toBeNull();
    const vh = Number(m[1]);
    expect(vh, 'needs enough height to centre into').toBeGreaterThanOrEqual(40);
    expect(vh, 'a full-viewport box inside the dashboard shell overflows below the fold').toBeLessThan(100);
    expect(body).toMatch(/justify-content:\s*center/);
  });

  it('still has both states to render', () => {
    const kit = fs.readFileSync(path.join(process.cwd(), 'src', 'components', 'facelift', 'index.js'), 'utf8');
    expect(kit).toMatch(/export function ErrorPage/);
    expect(kit).toMatch(/export function NotFoundPage/);
    // Both must use the class this test pins, or pinning it proves nothing.
    expect(kit.match(/s\.statePage/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});
