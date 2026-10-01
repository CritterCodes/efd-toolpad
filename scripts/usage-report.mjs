/**
 * `node scripts/usage-report.mjs [--since YYYY-MM-DD]` — which dashboard pages are opened, by whom, and which never are
 * (docs/GUARDRAILS_PLAN.md, "Retire what nobody uses"). Read-only. Run ~30 days after the page-open log ships; the
 * owner confirms each page before anything is deleted.
 *
 *   MONGODB_URI=... MONGO_DB_NAME=efd-database node scripts/usage-report.mjs --since 2026-10-01
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MongoClient } from 'mongodb';
import { PAGE_OPENS, routeFromPageFile } from '../src/services/usage/pageOpens.js';

const sinceArg = process.argv.indexOf('--since');
const since = sinceArg > -1 ? process.argv[sinceArg + 1] : '0000-00-00';

function pageFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) pageFiles(full, out);
    else if (/^page\.(js|jsx)$/.test(name)) out.push(full);
  }
  return out;
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGO_DB_NAME;
if (!uri || !dbName) { console.error('MONGODB_URI and MONGO_DB_NAME are required.'); process.exit(2); }
const client = new MongoClient(uri);
await client.connect();
try {
  const rows = await client.db(dbName).collection(PAGE_OPENS).find({ day: { $gte: since } }).toArray();
  const opens = new Map();
  for (const r of rows) {
    const e = opens.get(r.path) || { total: 0, roles: {} , lastDay: '' };
    e.total += r.count; e.roles[r.role] = (e.roles[r.role] || 0) + r.count; if (r.day > e.lastDay) e.lastDay = r.day;
    opens.set(r.path, e);
  }
  const days = [...new Set(rows.map((r) => r.day))].sort();
  const pages = pageFiles('src/app/dashboard').map((file) => ({
    route: routeFromPageFile(file), file: file.replace(/\\/g, '/'), lines: readFileSync(file, 'utf8').split('\n').length,
  }));
  const never = pages.filter((p) => !opens.has(p.route)).sort((a, b) => b.lines - a.lines);
  const used = pages.filter((p) => opens.has(p.route)).sort((a, b) => opens.get(a.route).total - opens.get(b.route).total);
  console.log(`Page opens since ${since}: ${rows.reduce((a, r) => a + r.count, 0)} across ${days.length} day(s) (${days[0] || '—'} → ${days.at(-1) || '—'})`);
  console.log(`\nNEVER OPENED — ${never.length} of ${pages.length} pages (largest first):`);
  for (const p of never) console.log(`  ${p.route.padEnd(60)} ${String(p.lines).padStart(5)} lines  ${p.file}`);
  console.log('\nOPENED, least first:');
  for (const p of used) {
    const e = opens.get(p.route);
    console.log(`  ${p.route.padEnd(60)} ${String(e.total).padStart(6)}  last ${e.lastDay}  ${Object.entries(e.roles).map(([r, n]) => `${r}:${n}`).join(' ')}`);
  }
} finally {
  await client.close();
}
