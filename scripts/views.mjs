/**
 * `npm run views` — open every dashboard page in a real browser, signed in as each role, at desktop and phone
 * width, and fail if anything got worse (docs/GUARDRAILS_PLAN.md, Phase 2; Kuzu's `pnpm views`).
 *
 * Needs a production build (`npm run build` with NEXT_PUBLIC_URL=http://localhost:4300 — the sign-in calls back
 * to that URL, and Next bakes it in at build time). Then:
 *   1. starts a throwaway in-memory MongoDB and seeds one account per role (e2e/views/seed.mjs)
 *   2. runs `next start` against it with every credential blanked — no email, Stripe, storage or Stuller call
 *      can leave the machine, and no real database is ever reachable
 *   3. crawls each role (e2e/views/crawl.mjs) and writes e2e/views/out/index.html, a contact sheet of every page
 *   4. compares the problems found to e2e/views/baseline.json (e2e/views/report.mjs)
 *
 * Flags: --update rewrites the baseline to what was found · --role admin crawls one role · --keep leaves the
 * server running. Local runs without the dev dependencies installed: VIEWS_MODULES=<dir with node_modules>.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { MongoClient } from 'mongodb';
import { seed } from '../e2e/views/seed.mjs';
import { crawlRole } from '../e2e/views/crawl.mjs';
import { compare, contactSheet, issueKeys } from '../e2e/views/report.mjs';
import { routeFromPageFile } from '../src/services/usage/pageOpens.js';

const ROOT = resolve(import.meta.dirname, '..');
const OUT = join(ROOT, 'e2e/views/out');
const BASELINE = join(ROOT, 'e2e/views/baseline.json');
const PORT = 4300;
const BASE_URL = `http://localhost:${PORT}`;
const DB_NAME = 'efd-views-check';
const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name) => (args.includes(`--${name}`) ? args[args.indexOf(`--${name}`) + 1] : null);

/** A dev dependency, from node_modules or (local runs) from VIEWS_MODULES. */
async function load(name) {
  try { return await import(name); } catch (e) {
    if (!process.env.VIEWS_MODULES) throw e;
    const req = createRequire(join(resolve(process.env.VIEWS_MODULES), 'package.json'));
    return import(pathToFileURL(req.resolve(name)).href);
  }
}

/** Every key in the .env files next build/start would load, plus anything in this shell that looks like a credential. */
function keysToBlank() {
  const keys = new Set();
  for (const f of readdirSync(ROOT).filter((n) => n.startsWith('.env'))) {
    for (const line of readFileSync(join(ROOT, f), 'utf8').split(/\r?\n/)) {
      const m = /^\s*(?:export\s+)?([A-Z_][A-Z0-9_]*)\s*=/.exec(line);
      if (m) keys.add(m[1]);
    }
  }
  const CREDENTIAL = /SECRET|KEY|TOKEN|PASS|SMTP|EMAIL|GMAIL|STRIPE|MINIO|AWS|STULLER|GEMINI|VAPID|META_|BLOGGER|CRON|EASYPOST|MONGO|_URL$|_URI$/;
  for (const k of Object.keys(process.env)) if (CREDENTIAL.test(k)) keys.add(k);
  return keys;
}

function serverEnv(mongoUri) {
  const env = { ...process.env };
  for (const k of keysToBlank()) env[k] = '';
  return Object.assign(env, {
    NODE_ENV: 'production',
    NEXT_TELEMETRY_DISABLED: '1',
    PORT: String(PORT),
    MONGODB_URI: mongoUri,
    MONGO_DB_NAME: DB_NAME,
    NEXT_PUBLIC_URL: BASE_URL,
    NEXTAUTH_URL: BASE_URL,
    NEXT_PUBLIC_ADMIN_URL: BASE_URL,
    AUTH_SECRET: randomBytes(32).toString('hex'),
    NEXTAUTH_SECRET: randomBytes(32).toString('hex'),
    JWT_SECRET: randomBytes(32).toString('hex'),
    ENCRYPTION_KEY: randomBytes(32).toString('base64'),
    // Storage is configured like production (MinIO is always set) but points nowhere: an upload fails, a page
    // that merely builds a storage client still renders.
    MINIO_ENDPOINT: '127.0.0.1',
    MINIO_PORT: '1',
    MINIO_USE_SSL: 'false',
    MINIO_BUCKET: 'views-check',
    MINIO_ACCESS_KEY: 'views-check',
    MINIO_SECRET_KEY: 'views-check',
  });
}

async function waitForServer(child) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`next start exited with ${child.exitCode}`);
    try { if ((await fetch(`${BASE_URL}/auth/signin`)).status < 500) return; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('next start did not come up within 90s');
}

function adminPagePaths() {
  const files = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) walk(join(dir, e.name));
      else if (/^page\.jsx?$/.test(e.name)) files.push(join(dir, e.name));
    }
  };
  walk(join(ROOT, 'src/app/dashboard'));
  return files.map(routeFromPageFile).filter((r) => !r.includes(':id'));
}

if (!existsSync(join(ROOT, '.next/BUILD_ID'))) {
  console.error('No production build. Run `npm run build` with NEXT_PUBLIC_URL=http://localhost:4300 first.');
  process.exit(2);
}

const { MongoMemoryServer } = await load('mongodb-memory-server');
const playwright = await load('@playwright/test');
const chromium = playwright.chromium || playwright.default?.chromium;
const mongo = await MongoMemoryServer.create();
const client = new MongoClient(mongo.getUri());
await client.connect();
const accounts = await seed(client.db(DB_NAME));

const nextBin = join(ROOT, 'node_modules/next/dist/bin/next');
const server = spawn(process.execPath, [nextBin, 'start', '-p', String(PORT)], { cwd: ROOT, env: serverEnv(mongo.getUri()), stdio: ['ignore', 'pipe', 'pipe'] });
const serverLog = [];
for (const s of [server.stdout, server.stderr]) s.on('data', (d) => serverLog.push(String(d)));

let exitCode = 0;
let browser;
try {
  await waitForServer(server);
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  browser = await chromium.launch();
  const only = opt('role');
  const results = [];
  for (const account of accounts.filter((a) => !only || a.key === only)) {
    const started = Date.now();
    const extraPaths = account.key === 'admin' ? adminPagePaths() : [];
    const found = await crawlRole(browser, BASE_URL, account, { outDir: OUT, extraPaths });
    results.push(...found);
    console.log(`${account.key}: ${found.length / 2} pages, ${found.filter((r) => r.issues.length).length} views with problems (${Math.round((Date.now() - started) / 1000)}s)`);
  }

  const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : [];
  const verdict = compare(results, baseline);
  contactSheet(results, OUT, verdict);
  writeFileSync(join(OUT, 'server.log'), serverLog.join(''));

  // What --update would write, kept beside the contact sheet: when CI (Linux fonts) and a local run disagree,
  // CI's own file can be adopted from the artifact.
  const keep = baseline.filter((k) => only && k.split('|')[0] !== only);
  const next = `${JSON.stringify([...keep, ...issueKeys(results)].sort(), null, 2)}\n`;
  writeFileSync(join(OUT, 'baseline.next.json'), next);

  if (flag('update')) {
    writeFileSync(BASELINE, next);
    console.log(`Baseline rewritten: ${verdict.total} problems (${verdict.added.length} added, ${verdict.fixed.length} gone).`);
  } else {
    console.log(`\n${verdict.total} problems; baseline ${baseline.length}. Contact sheet: e2e/views/out/index.html`);
    // Timing-dependent problems are listed, never failed: a check that fails at random teaches people to re-run it.
    if (verdict.timing.length) console.log(`${verdict.timing.length} timing-dependent problems this run (console / API / hydration; on the contact sheet, not failing).`);
    if (verdict.added.length) {
      console.error(`\nNEW problems — fix them (or, if a problem is accepted, record it with --update):\n  ${verdict.added.join('\n  ')}`);
      exitCode = 1;
    }
    if (verdict.fixed.length) {
      console.error(`\nFixed — shrink the baseline with \`npm run views -- --update\` so they stay fixed:\n  ${verdict.fixed.join('\n  ')}`);
      exitCode = exitCode || 3;
    }
  }
} catch (e) {
  console.error(e);
  console.error(`\nserver log (last 40 lines):\n${serverLog.join('').split('\n').slice(-40).join('\n')}`);
  exitCode = 2;
} finally {
  await browser?.close();
  if (!flag('keep')) {
    server.kill();
    await client.close();
    await mongo.stop();
  }
}
if (!flag('keep')) process.exit(exitCode);
