/**
 * The crawl behind the views check (docs/GUARDRAILS_PLAN.md, Phase 2): sign in as each role, open every
 * dashboard page that role can reach, at desktop and phone width, and record what's wrong with each.
 *
 * Reachable = the sidebar (every group opened) plus every /dashboard link on every page visited, one page per
 * URL shape (/dashboard/repairs/:id is opened once, not once per repair). The admin also opens every page file
 * without an id in its path, so a page nobody links to is still looked at.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { normalizePath } from '../../src/services/usage/pageOpens.js';

export const WIDTHS = { desktop: { width: 1440, height: 900 }, phone: { width: 375, height: 812 } };
const MAX_PAGES_PER_ROLE = 250;
const SETTLE_MS = 8000;
const CONCURRENCY = 4;

/**
 * Runs in the page. How far the widest visible element sticks out past the right edge of the screen.
 *
 * Not `scrollWidth`: globals.css sets `overflow-x: clip` on html and body, so content wider than a phone is CUT
 * OFF rather than scrollable, and the page's scrollWidth never shows it. Walks the tree instead; an element
 * that scrolls or clips its own content sideways (a table in a scroll box) contains its children, so they don't
 * count. Elements entirely off screen (a closed drawer) don't count either.
 */
function cutOff() {
  const W = window.innerWidth;
  let overflowBy = 0;
  let overflowAt = '';
  const describe = (el) => `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${typeof el.className === 'string' && el.className ? `.${el.className.trim().split(/\s+/).slice(0, 2).join('.')}` : ''}`;
  const walk = (parent) => {
    for (const el of parent.children) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.position === 'fixed') continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.left < W && r.right - W > overflowBy) {
        overflowBy = Math.round(r.right - W);
        overflowAt = describe(el);
      }
      if (cs.overflowX === 'visible') walk(el);
    }
  };
  walk(document.body);
  return { overflowBy, overflowAt };
}

const slug = (path) => (path.replace(/^\/dashboard\/?/, '').replace(/[^a-z0-9]+/gi, '_') || 'home');

async function signIn(browser, baseURL, account) {
  const context = await browser.newContext({ baseURL, viewport: WIDTHS.desktop });
  const page = await context.newPage();
  await page.goto('/auth/signin');
  await page.fill('#email', account.email);
  await page.fill('#password', account.password);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.startsWith('/auth'), { timeout: 30_000 }).catch(() => {});
  const where = new URL(page.url()).pathname;
  if (where.startsWith('/auth')) {
    const message = await page.locator('form').innerText().catch(() => '');
    throw new Error(`${account.key} could not sign in (still on ${where}): ${message.slice(0, 200)}`);
  }
  await page.close();
  return context;
}

/** Open every sidebar group, then list the /dashboard links on the page. */
async function sidebarLinks(context) {
  const page = await context.newPage();
  await page.goto('/dashboard');
  await page.waitForLoadState('networkidle', { timeout: SETTLE_MS }).catch(() => {});
  for (let i = 0; i < 40; i += 1) {
    const closed = page.locator('nav [aria-expanded="false"]:visible').first();
    if (!(await closed.count())) break;
    await closed.click().catch(() => {});
  }
  const hrefs = await dashboardHrefs(page);
  await page.close();
  return hrefs;
}

function dashboardHrefs(page) {
  return page.$$eval('a[href^="/dashboard"]', (as) => as.map((a) => a.getAttribute('href')));
}

/** Open one URL at one width; everything wrong with it, plus the links it offers. */
async function visit(context, url, widthKey, outDir) {
  const page = await context.newPage();
  await page.setViewportSize(WIDTHS[widthKey]);
  const consoleErrors = [];
  const pageErrors = [];
  const failedApis = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => pageErrors.push(String(e.message || e).slice(0, 300)));
  page.on('response', (r) => {
    const u = new URL(r.url());
    // Every refused or failed API call is named (a console "Failed to load resource" doesn't say which);
    // only a 5xx is an issue on its own — a 403 may be the page asking for what this role can't have.
    if (u.pathname.startsWith('/api/') && r.status() >= 400) failedApis.push(`${r.status()} ${u.pathname}`);
  });

  let status = 0;
  // A network-level failure (net::ERR_…: the browser ran out of sockets, a connection reset on a live deploy)
  // says nothing about the page, so it gets one retry. A page that fails twice is reported as before.
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      status = res ? res.status() : 0;
      break;
    } catch (e) {
      const message = String(e.message).split('\n')[0];
      if (attempt === 1 && /net::ERR_/.test(message)) { await page.waitForTimeout(1500); continue; }
      pageErrors.push(`navigation: ${message}`);
      break;
    }
  }
  await page.waitForLoadState('networkidle', { timeout: SETTLE_MS }).catch(() => {});
  await page.waitForTimeout(300);

  const finalPath = new URL(page.url()).pathname;
  const measure = () => page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('h1,h2,h3,h4,h5,h6')?.textContent?.trim().slice(0, 80) || '',
    h1: !!document.querySelector('h1'),
    text: document.body?.innerText?.trim().length || 0,
  })).catch(() => ({ title: '', heading: '', h1: true, text: 0 }));
  let metrics = await measure();
  // A page still loading (spinner, "Loading users…") looks blank or title-less. On a busy CI runner that
  // happened at one width and not the other (2026-10-01), so before calling it, give it up to 8s more to
  // finish — until it has an <h1>, or no spinner is left — and measure again. The settled page is what counts.
  if (!metrics.h1 || metrics.text < 20) {
    await page.waitForFunction(
      () => document.querySelector('h1') || !document.querySelector('[role="progressbar"], .MuiSkeleton-root'),
      null, { timeout: 8000 },
    ).catch(() => {});
    await page.waitForTimeout(300);
    metrics = await measure();
  }
  Object.assign(metrics, await page.evaluate(cutOff).catch(() => ({ overflowBy: 0, overflowAt: '' })));
  const links = widthKey === 'desktop' ? await dashboardHrefs(page).catch(() => []) : [];

  const shot = `${widthKey}/${slug(normalizePath(url))}.jpg`;
  mkdirSync(join(outDir, widthKey), { recursive: true });
  await page.screenshot({ path: join(outDir, shot), type: 'jpeg', quality: 55 }).catch(() => {});
  await page.close();

  const issues = [];
  if (finalPath.startsWith('/auth')) issues.push('signed-out');
  else if (status === 404) issues.push('not-found');
  else if (status >= 500 || status === 0) issues.push('server-error');
  // React #418/#423/#425 = the server's HTML and the first client render disagreed (hydration). It strikes
  // different pages on different runs (seen on CI 2026-10-01), so it's its own, timing-dependent kind; any
  // other uncaught exception is a page-error.
  const HYDRATION = /Minified React error #(418|423|425)(?!\d)|[Hh]ydration/;
  if (pageErrors.some((e) => !HYDRATION.test(e))) issues.push('page-error');
  if (pageErrors.some((e) => HYDRATION.test(e))) issues.push('hydration-mismatch');
  if (consoleErrors.length) issues.push('console-error');
  if (failedApis.some((f) => f.startsWith('5'))) issues.push('api-error');
  if (metrics.overflowBy > 1) issues.push('overflow');
  if (!finalPath.startsWith('/auth') && status < 400 && metrics.text < 20) issues.push('blank');
  else if (!finalPath.startsWith('/auth') && status < 400 && !metrics.h1) issues.push('no-h1'); // a page says what it is

  return {
    url, path: normalizePath(url), width: widthKey, status, finalPath, shot, issues, links,
    heading: metrics.heading, overflowBy: metrics.overflowBy, overflowAt: metrics.overflowAt,
    consoleErrors: [...new Set(consoleErrors)].slice(0, 5),
    pageErrors: [...new Set(pageErrors)].slice(0, 5),
    failedApis: [...new Set(failedApis)].slice(0, 5),
  };
}

/** Run `fn` over `items`, `n` at a time. */
async function pool(items, n, fn) {
  const out = [];
  let next = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i]); }
  }));
  return out;
}

/**
 * Crawl one role. `extraPaths` are opened too (the admin's unlinked page files). Returns one result per
 * (page shape, width), plus where each page was linked from so a 404 can be traced to its link.
 */
export async function crawlRole(browser, baseURL, account, { outDir, extraPaths = [] }) {
  const context = await signIn(browser, baseURL, account);
  const roleDir = join(outDir, account.key);
  const seen = new Map(); // shape -> { url, from }
  const queue = [];
  const enqueue = (href, from) => {
    if (!href) return;
    const url = href.split('#')[0];
    const shape = normalizePath(url);
    if (/log-?out|sign-?out/i.test(shape)) return; // would end the session mid-crawl
    if (!shape.startsWith('/dashboard') || seen.has(shape) || seen.size >= MAX_PAGES_PER_ROLE) return;
    seen.set(shape, { url, from });
    queue.push(url);
  };
  enqueue('/dashboard', 'start');
  for (const href of await sidebarLinks(context)) enqueue(href, 'sidebar');
  for (const p of extraPaths) enqueue(p, 'page file');

  const results = [];
  while (queue.length) {
    const batch = queue.splice(0, queue.length);
    const desktop = await pool(batch, CONCURRENCY, (url) => visit(context, url, 'desktop', roleDir));
    for (const r of desktop) for (const href of r.links) enqueue(href, r.path);
    const phone = await pool(batch, CONCURRENCY, (url) => visit(context, url, 'phone', roleDir));
    results.push(...desktop, ...phone);
  }
  await context.close();
  return results.map(({ links: _links, ...r }) => ({ ...r, role: account.key, from: seen.get(r.path)?.from || '' }));
}
