import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GUARD: the app keeps its shape while it loads, and says something human when it breaks.
 *
 * efd-admin shipped with **no** `loading.js`, `error.js` or `not-found.js` anywhere under `src/app`. So a
 * route change blanked the content area and floated one of 130 files' hand-placed `<CircularProgress />`
 * at 50vh; a thrown render error showed Next's own page, which in production reads "Application error: a
 * client-side exception has occurred"; and a bad URL showed an unstyled white 404. A jeweler mid-job got
 * no way back to the bench from any of them.
 *
 * These files are cheap to add and easy to delete by accident, because nothing imports them — Next finds
 * them by name. That is exactly why they need a test.
 */
const APP = path.resolve(__dirname);

const REQUIRED = {
  'dashboard/loading.js': 'the dashboard keeps its frame while a route loads',
  'dashboard/error.js': 'a thrown error inside the dashboard offers a retry and a way back',
  'dashboard/not-found.js': 'a dead dashboard URL keeps the nav',
  'not-found.js': 'a dead URL outside the dashboard is not a bare Next 404',
  'global-error.js': 'an error in the root layout, where no layout is left to render into',
};

describe('route-level states', () => {
  it.each(Object.entries(REQUIRED))('%s exists — %s', (rel) => {
    expect(fs.existsSync(path.join(APP, rel)), `src/app/${rel} is missing`).toBe(true);
  });

  it('the two error boundaries are client components, as Next requires', () => {
    for (const rel of ['dashboard/error.js', 'global-error.js']) {
      const text = fs.readFileSync(path.join(APP, rel), 'utf8');
      expect(text.trimStart().startsWith("'use client'"), `${rel} needs 'use client'`).toBe(true);
      expect(text, `${rel} should offer the reset Next hands it`).toMatch(/\breset\b/);
    }
  });

  it('an error page shows the digest and never the stack', () => {
    // The digest ties the report to a server log. The stack tells the person nothing and tells anyone
    // reading over their shoulder too much.
    for (const rel of ['dashboard/error.js', 'global-error.js']) {
      const text = fs.readFileSync(path.join(APP, rel), 'utf8');
      expect(text).toMatch(/digest/);
      expect(text, `${rel} must not render error.stack`).not.toMatch(/error\??\.\s*stack/);
    }
  });

  it('global-error carries its own document and no kit import', () => {
    // Next replaces the whole document here, and the kit is part of the tree that just failed.
    const text = fs.readFileSync(path.join(APP, 'global-error.js'), 'utf8');
    expect(text).toMatch(/<html\b/);
    expect(text).toMatch(/<body\b/);
    expect(text).not.toMatch(/@\/components\/facelift/);
  });
});

/**
 * The second half, added 2026-10-02: a loading state has to be the shape of what is coming.
 *
 * `dashboard/loading.js` stopped every route blanking, but it draws the same three soft panels whether the
 * destination is a table of forty repair tickets or a grid of product cards. The page therefore still
 * changed shape under the reader at the moment it loaded — a skeleton of the wrong shape is a second
 * layout shift wearing a disguise, and it is the one nobody counts because the screen was "already doing
 * something".
 *
 * These segments carry the heaviest lists in the app (repairs: 20 files with a hand-placed spinner across
 * 27 pages; products: 21 across 17). Next picks the nearest ancestor, so a segment file wins over the
 * dashboard-wide one without either knowing about the other.
 */
const SHAPED = {
  'dashboard/repairs/loading.js': 'table',
  'dashboard/products/loading.js': 'cards',
  'dashboard/customs/loading.js': 'cards',
  'dashboard/users/loading.js': 'table',
  'dashboard/admin/loading.js': 'table',
};

describe('a loading state is the shape of what is coming', () => {
  it.each(Object.entries(SHAPED))('%s loads as "%s"', (rel, shape) => {
    const file = path.join(APP, rel);
    expect(fs.existsSync(file), `src/app/${rel} is missing`).toBe(true);
    const text = fs.readFileSync(file, 'utf8');
    expect(text, `${rel} should ask for the ${shape} shape`).toMatch(new RegExp(`shape=["']${shape}["']`));
    // Without the kit root the CSS variables the skeleton is drawn with do not resolve.
    expect(text, `${rel} needs FaceliftRoot`).toMatch(/FaceliftRoot/);
  });

  it('the kit can draw both shapes', () => {
    const kit = fs.readFileSync(path.resolve(APP, '../components/facelift/skeletons.js'), 'utf8');
    expect(kit).toMatch(/export function SkeletonTable\b/);
    expect(kit).toMatch(/export function SkeletonCards\b/);
    // The card skeleton must use the same grid as the real one, or the columns move when data lands.
    expect(kit).toMatch(/s\.cardGrid/);
  });

  it('every shaped state announces itself to a screen reader', () => {
    const kit = fs.readFileSync(path.resolve(APP, '../components/facelift/skeletons.js'), 'utf8');
    expect(kit).toMatch(/role="status"/);
    expect(kit).toMatch(/aria-busy="true"/);
    // The bars themselves are decoration; only the region should be announced.
    expect(kit).toMatch(/aria-hidden="true"/);
  });
});
