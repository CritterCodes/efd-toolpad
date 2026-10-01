/**
 * `node scripts/views-remote.mjs <deploy-url>` — the views crawl, signed in as each e2e account, against a live
 * PREVIEW deploy (docs/GUARDRAILS_PLAN.md Phase 2 item 8; owner, 2026-10-01: Q1 "yes"). Run by
 * .github/workflows/ship.yml after a successful Preview deploy.
 *
 * Previews run on the DEV database (efd-database-DEV). The accounts are the views-check accounts
 * (e2e/views/seed.mjs ACCOUNTS: <role>@views.check), put there by scripts/seed-preview-e2e.mjs, all with one
 * password the owner chose: E2E_PREVIEW_PASSWORD (a GitHub secret). Without it this exits 0 and says so.
 *
 * Never production: refuses any URL on engelfinedesign.com. Read-only by intent — it opens pages and follows
 * links; it submits nothing.
 *
 * Unlike the PR check there is no baseline (the dev data differs from the seed): it fails only on problems that
 * mean the deploy is broken for someone — signed out, a 404 link, a server error, an uncaught exception, a blank
 * page. Missing <h1> and cut-offs are the PR check's job.
 */
import { mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ACCOUNTS } from '../e2e/views/seed.mjs';
import { crawlRole } from '../e2e/views/crawl.mjs';
import { contactSheet } from '../e2e/views/report.mjs';

const BROKEN = new Set(['signed-out', 'not-found', 'server-error', 'page-error', 'blank']);
const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'e2e/views/out');

const base = (process.argv[2] || '').replace(/\/+$/, '');
const password = process.env.E2E_PREVIEW_PASSWORD || '';
if (!base) { console.error('usage: node scripts/views-remote.mjs <deploy-url>'); process.exit(2); }
if (/engelfinedesign\.com/i.test(base)) { console.error(`Refusing ${base}: signed-in checks run against previews only.`); process.exit(2); }
if (!password) { console.log('Skipped: no E2E_PREVIEW_PASSWORD secret (docs/OPEN-QUESTIONS.md Q1).'); process.exit(0); }

async function load(name) {
  try { return await import(name); } catch (e) {
    if (!process.env.VIEWS_MODULES) throw e;
    const req = createRequire(join(resolve(process.env.VIEWS_MODULES), 'package.json'));
    return import(pathToFileURL(req.resolve(name)).href);
  }
}
const playwright = await load('@playwright/test');
const chromium = playwright.chromium || playwright.default?.chromium;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const results = [];
const failures = [];
try {
  for (const a of ACCOUNTS) {
    try {
      const found = await crawlRole(browser, base, { key: a.key, email: a.email, password }, { outDir: OUT });
      results.push(...found);
      console.log(`${a.key}: ${found.length / 2} pages`);
    } catch (e) {
      failures.push(`${a.key}: ${String(e.message).split('\n')[0]}`); // e.g. the account isn't seeded on this database
    }
  }
} finally {
  await browser.close();
}
contactSheet(results, OUT);
const broken = results.filter((r) => r.issues.some((i) => BROKEN.has(i)))
  .map((r) => `${r.role}|${r.width}|${r.path}|${r.issues.filter((i) => BROKEN.has(i)).join(',')}  (linked from ${r.from})`);
for (const f of failures) console.error(`✖ ${f}`);
for (const b of broken) console.error(`✖ ${b}`);
console.log(`\n${results.length / 2} page views per width; ${broken.length} broken; ${failures.length} account(s) could not sign in.`);
process.exit(broken.length || failures.length ? 1 : 0);
