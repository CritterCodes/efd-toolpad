import { describe, it, expect } from 'vitest';
import * as viaAlias from '@/lib/appUrls';
import * as viaRoot from '../../lib/appUrls.js';

/**
 * `src/lib/appUrls.js` is an EXPLICIT re-export shim, so anything added to the root module is missing
 * here until it is listed — arriving as `undefined` and failing at the call site.
 *
 * That shipped: publishing a quote 500'd with "(0 , z.portalLink) is not a function" AFTER the quote had
 * been saved, so quotes looked published and no email went out. My unit test for portalLink imported the
 * ROOT module directly, so it exercised a path production never takes.
 *
 * This asserts the shim is COMPLETE, so the next added export cannot repeat it.
 */
describe('the @/lib/appUrls shim re-exports everything', () => {
  it('exposes every function the root module does', () => {
    const rootFns = Object.keys(viaRoot).filter((k) => typeof viaRoot[k] === 'function').sort();
    const aliasFns = Object.keys(viaAlias).filter((k) => typeof viaAlias[k] === 'function').sort();
    expect(aliasFns).toEqual(rootFns);
  });

  it('exposes every non-function export too (constants like PORTAL_TABS)', () => {
    expect(Object.keys(viaAlias).sort()).toEqual(Object.keys(viaRoot).sort());
  });

  it('portalLink is callable through the alias — the exact failure that reached production', () => {
    expect(typeof viaAlias.portalLink).toBe('function');
    expect(viaAlias.portalLink('CO-abc', 'quote')).toContain('id=CO-abc&tab=quote');
  });
});
