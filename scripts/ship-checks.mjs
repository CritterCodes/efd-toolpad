/**
 * `node scripts/ship-checks.mjs <url> [<url> …]` — anonymous checks against a live deploy (docs/GUARDRAILS_PLAN.md,
 * Phase 2 item 8; Kuzu's ship-checks). Run by .github/workflows/ship.yml after every Vercel deploy, and by hand
 * against any URL. Read-only: it signs in as nobody, submits nothing, and only GETs.
 *
 * Signed-in checks against previews are NOT here: they'd need standing accounts + passwords in the dev database
 * and GitHub (docs/OPEN-QUESTIONS.md). The signed-in, every-role crawl runs on every PR instead (`npm run views`).
 */
import { appendFileSync } from 'node:fs';

const urls = process.argv.slice(2).map((u) => u.replace(/\/+$/, '')).filter(Boolean);
if (!urls.length) { console.error('usage: node scripts/ship-checks.mjs <url> [<url> …]'); process.exit(2); }

async function load(name) {
  try { return await import(name); } catch (e) {
    if (!process.env.VIEWS_MODULES) throw e;
    const { createRequire } = await import('node:module');
    const { pathToFileURL } = await import('node:url');
    const req = createRequire(`${process.env.VIEWS_MODULES.replace(/\/?$/, '/')}package.json`);
    return import(pathToFileURL(req.resolve(name)).href);
  }
}
const playwright = await load('@playwright/test');
const chromium = playwright.chromium || playwright.default?.chromium;

const get = (url, init = {}) => fetch(url, { redirect: 'manual', ...init });

/** Each check: a name, and a function that returns null (pass) or what's wrong. */
const CHECKS = [
  ['sign-in page renders with no errors', async (base, browser) => {
    const page = await browser.newPage();
    const errors = [];
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text().slice(0, 200)); });
    page.on('pageerror', (e) => errors.push(String(e.message || e).slice(0, 200)));
    const res = await page.goto(`${base}/auth/signin`, { waitUntil: 'networkidle', timeout: 45_000 }).catch((e) => ({ status: () => `failed: ${e.message.split('\n')[0]}` }));
    const ok = res.status() === 200 && (await page.locator('#email').count()) && (await page.locator('#password').count());
    await page.close();
    if (!ok) return `status ${res.status()}, sign-in form ${ok ? 'present' : 'missing'}`;
    return errors.length ? `console: ${[...new Set(errors)].join(' | ')}` : null;
  }],
  ['the dashboard sends a stranger to sign in', async (base) => {
    const res = await get(`${base}/dashboard`);
    const to = res.headers.get('location') || '';
    return res.status >= 300 && res.status < 400 && to.includes('/auth/signin') ? null : `status ${res.status}, location "${to}"`;
  }],
  ['the API refuses a stranger', async (base) => {
    const wrong = [];
    for (const path of ['/api/users', '/api/repairs', '/api/admin/settings']) {
      const res = await get(`${base}${path}`);
      if (res.status !== 401 && res.status !== 403) wrong.push(`${path} → ${res.status}`);
    }
    return wrong.length ? wrong.join(', ') : null;
  }],
  ['an unknown page is a 404', async (base) => {
    const res = await get(`${base}/ship-check-${Date.now().toString(36)}`);
    return res.status === 404 ? null : `status ${res.status}`;
  }],
  ['search engines are told to stay out', async (base) => {
    const page = await get(`${base}/auth/signin`);
    const header = page.headers.get('x-robots-tag') || '';
    const html = await page.text();
    const meta = /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html);
    const robots = await get(`${base}/robots.txt`);
    const txt = robots.status === 200 ? await robots.text() : '';
    const disallowed = /Disallow:\s*\/\s*$/im.test(txt);
    if ((header.includes('noindex') || meta) && disallowed) return null;
    return `noindex header "${header}", meta ${meta ? 'yes' : 'no'}, robots.txt ${robots.status}${disallowed ? ' disallows /' : ' allows crawling'}`;
  }],
  ['no source maps are public', async (base) => {
    const html = await (await get(`${base}/auth/signin`)).text();
    const chunks = [...new Set(html.match(/\/_next\/static\/chunks\/[^"']+\.js/g) || [])].slice(0, 6);
    if (!chunks.length) return 'no script chunks found on the sign-in page';
    const exposed = [];
    for (const c of chunks) if ((await get(`${base}${c}.map`)).status === 200) exposed.push(`${c}.map`);
    return exposed.length ? `served: ${exposed.join(', ')}` : null;
  }],
];

const browser = await chromium.launch();
const rows = [];
try {
  for (const base of urls) {
    for (const [name, check] of CHECKS) {
      let problem;
      try { problem = await check(base, browser); } catch (e) { problem = `threw: ${String(e.message).split('\n')[0]}`; }
      rows.push({ base, name, problem });
      console.log(`${problem ? '✖' : '✔'} ${base}  ${name}${problem ? `\n    ${problem}` : ''}`);
    }
  }
} finally {
  await browser.close();
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const md = ['| Deploy | Check | Result |', '|---|---|---|',
    ...rows.map((r) => `| ${r.base} | ${r.name} | ${r.problem ? `✖ ${r.problem.replace(/\|/g, '\\|')}` : '✔'} |`)];
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${md.join('\n')}\n`);
}
const failed = rows.filter((r) => r.problem);
console.log(`\n${rows.length - failed.length}/${rows.length} passed`);
process.exit(failed.length ? 1 : 0);
