import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GUARD (EFD-DEFECTS P7): a notification's "view" link must go somewhere that exists.
 *
 * Three did not. `/dashboard/payroll` has **never** existed in this app, and two notifications sent an
 * artisan there — the one telling them they had been paid, and the one telling them payouts were
 * enabled. `/dashboard/products/pending` did not exist either; the queue is at `/dashboard/pending`.
 *
 * These are the worst kind of dead link: they are in an email and a push notification, so the person
 * taps them on a phone, away from the shop, at the moment they most want to see the money.
 *
 * Nothing imports these URLs, nothing renders them in a page, and no crawl visits them — they are
 * strings inside an API route — so the views check cannot see them. This can.
 */
// This test lives in src/app/api, so `src/app` (where routes resolve from) is one level up and `src`
// (where the link sites are) is two.
const APP = path.resolve(__dirname, '..');
const SRC = path.resolve(__dirname, '../..');

/** `actionUrl: `${adminBase()}/some/path`` — the literal part, up to any interpolation. */
const ACTION_URL = /actionUrl:\s*`\$\{adminBase\(\)\}([^`]*)`/g;

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

/**
 * Resolve an app route the way Next would.
 *
 * `ok` — it renders something. `literalHitDynamic` — a **hard-coded** segment matched only a `[param]`
 * folder, which is the subtler half of this defect: `/dashboard/products/pending` is not a 404, it
 * matches `[id]` and renders a product detail screen for a product called "pending". A page that is
 * wrong is worse than a page that is missing, because nothing reports it.
 */
function resolveRoute(route) {
  const segments = route.split('/').filter(Boolean);
  let dir = APP;
  let literalHitDynamic = false;

  for (const segment of segments) {
    if (!fs.existsSync(dir)) return { ok: false, literalHitDynamic };
    const entries = fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory());
    const exact = entries.find((e) => e.name === segment);
    const dynamic = entries.find((e) => /^\[.+\]$/.test(e.name));
    const interpolated = segment.includes('${');

    // An interpolated segment IS a runtime value, so landing on a dynamic folder is correct for it.
    const next = interpolated ? dynamic : (exact || dynamic);
    if (!next) return { ok: false, literalHitDynamic };
    if (!interpolated && !exact && dynamic) literalHitDynamic = true;

    dir = path.join(dir, next.name);
  }

  const ok = fs.existsSync(path.join(dir, 'page.js')) || fs.existsSync(path.join(dir, 'page.jsx'));
  return { ok, literalHitDynamic };
}

const routeExists = (route) => resolveRoute(route).ok;

const linkSites = () => {
  const found = [];
  for (const file of sourceFiles(SRC)) {
    const text = fs.readFileSync(file, 'utf8');
    for (const m of text.matchAll(ACTION_URL)) {
      // A whole path computed by a helper (e.g. payoutPagePath(role)) is covered by that helper's own test.
      if (m[1].startsWith('${')) continue;
      found.push({ route: m[1], file: path.relative(SRC, file).replace(/\\/g, '/') });
    }
  }
  return found;
};

describe('a notification link', () => {
  it('points at a page that exists', () => {
    const dead = linkSites()
      .filter(({ route }) => !routeExists(route))
      .map(({ route, file }) => `${route}  (${file})`);

    expect(dead).toEqual([]);
  });

  it('does not land a hard-coded segment on a [param] route', () => {
    // `/dashboard/products/pending` rendered the product detail screen for a product called "pending".
    const wrong = linkSites()
      .filter(({ route }) => resolveRoute(route).literalHitDynamic)
      .map(({ route, file }) => `${route}  (${file})`);

    expect(wrong).toEqual([]);
  });

  it('is actually finding the links', () => {
    // A regex that matched nothing would pass the assertions above while checking nothing.
    const routes = linkSites().map((l) => l.route);
    expect(routes.length).toBeGreaterThanOrEqual(4);
    expect(routes).toContain('/dashboard/artisan/payroll');
  });

  it('knows a dead route, a wrong one, and a live one apart', () => {
    expect(resolveRoute('/dashboard/artisan/payroll')).toEqual({ ok: true, literalHitDynamic: false });
    expect(resolveRoute('/dashboard/products/awaiting-approval')).toEqual({ ok: true, literalHitDynamic: false });

    // Never existed at all — the link two payout notifications carried.
    expect(resolveRoute('/dashboard/payroll').ok).toBe(false);

    // Renders, but renders the wrong thing: this is the one a 404 check would have missed.
    expect(resolveRoute('/dashboard/products/pending')).toEqual({ ok: true, literalHitDynamic: true });

    // An interpolated segment is a runtime value, so resolving through [param] is correct for it.
    expect(resolveRoute('/dashboard/admin/affiliates/${commission.affiliateId}'))
      .toEqual({ ok: true, literalHitDynamic: false });
  });
});
