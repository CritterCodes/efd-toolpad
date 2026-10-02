import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GUARD: the catalogue the bench now searches stays staff-only.
 *
 * F48 gave "Move to Needs Parts" a search, so a jeweler no longer has to produce a Stuller part number from
 * memory with the piece in their hand. `NeedsPartsDialog.search.test.jsx` covers what the dialog *does*;
 * this covers the thing a behaviour test cannot see.
 *
 * `/api/stuller/search` was once an open proxy — unauthenticated, spending EFD's Stuller API credentials
 * and returning wholesale cost to anyone who asked. Its sibling `/api/stuller/item` was guarded while it
 * was not: the same parent/child asymmetry that hid two earlier holes. `routeAuthorization.guard` checks
 * the writing verbs, so a GET that leaks cost data is exactly the shape it does not cover.
 *
 * Putting more of the bench on this endpoint makes it more attractive, not less, so it is pinned here.
 */
const ROUTE = path.resolve(__dirname, '../../../../api/stuller/search/route.js');
const ITEM_ROUTE = path.resolve(__dirname, '../../../../api/stuller/item/route.js');

const read = (p) => fs.readFileSync(p, 'utf8');

describe('the Stuller catalogue endpoints', () => {
  it('search authorizes beyond sign-in', () => {
    expect(read(ROUTE)).toMatch(/requireRole\(\s*STAFF_ROLES\s*\)/);
  });

  it('item does too, by its own rule — the pair is the thing that drifts', () => {
    // These two have been out of step before; checking one without the other is how that happened.
    //
    // They are deliberately not the same gate. `item` is a single lookup that repair intake performs, so
    // it allows anyone who may write up a job — stores included (owner, Q11: "Definitely a store. That's
    // our flagship intake"). `search` returns a list of wholesale costs and stays STAFF_ROLES. Both must
    // gate on something beyond "is signed in", which is what every one of these holes has been.
    //
    // Not asserted here: "the old `email?.includes('@')` idiom is gone". The file's own header *describes*
    // that idiom, so the check passed on the comment and failed on the fix — a guard reading documentation
    // instead of code. The gate below is the claim that can actually be made from the text.
    expect(read(ITEM_ROUTE)).toMatch(/canReadPricingCatalog|requireRole|STAFF_ROLES/);
  });
});
