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
