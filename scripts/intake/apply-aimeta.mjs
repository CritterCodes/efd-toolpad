#!/usr/bin/env node
/**
 * Put scripts/intake/aimeta-proposal.json onto the live tasks' `aiMeta` — the text smart intake sends the model.
 *
 *   node scripts/intake/apply-aimeta.mjs --env <.env.production>            DRY RUN: prints before/after, writes nothing
 *   node scripts/intake/apply-aimeta.mjs --env <.env.production> --apply --owner-said-yes
 *
 * A PRODUCTION WRITE. It does not run without both flags, and the second one is a statement: the owner has read the
 * dry run and said yes (CLAUDE.md, session rule 6; docs/goals/SMART_INTAKE.md, D1). It touches `aiMeta.symptoms`,
 * `aiMeta.whenToUse` and `aiMeta.neverUseWhen` on the tasks named in the proposal and nothing else, matches each
 * task by exact title, refuses if a title matches no task or more than one, and saves the previous values to
 * scripts/intake/aimeta-before-<date>.json first so it can be put back.
 *
 * Measure a proposal before asking: `npm run intake:replay -- --proposal`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : ''; };
const APPLY = process.argv.includes('--apply') && process.argv.includes('--owner-said-yes');
if (process.argv.includes('--apply') && !APPLY) {
  console.error('--apply needs --owner-said-yes as well. Nothing was written.');
  process.exit(1);
}
const envFile = arg('--env');
if (envFile) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}
if (!process.env.MONGODB_URI) { console.error('MONGODB_URI is not set. Pass --env <path to .env.production>.'); process.exit(1); }

const proposal = JSON.parse(fs.readFileSync(path.join(here, 'aimeta-proposal.json'), 'utf8'));
const titles = Object.keys(proposal).filter((k) => !k.startsWith('_'));

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
try {
  const tasks = client.db('efd-database').collection('tasks');
  const plan = [];
  for (const title of titles) {
    const found = await tasks.find({ title, isActive: { $ne: false } }, { projection: { title: 1, aiMeta: 1 } }).toArray();
    if (found.length !== 1) { console.error(`"${title}": ${found.length} active tasks have this title. Nothing was written.`); process.exit(1); }
    plan.push({ _id: found[0]._id, title, before: found[0].aiMeta || {}, after: proposal[title] });
  }
  for (const { title, before, after } of plan) {
    console.log(`\n== ${title}`);
    for (const key of ['symptoms', 'whenToUse', 'neverUseWhen']) {
      const was = JSON.stringify(before[key] ?? (key === 'symptoms' ? [] : ''));
      const now = JSON.stringify(after[key]);
      if (was !== now) console.log(`  ${key}\n    - ${was}\n    + ${now}`);
    }
  }
  if (!APPLY) { console.log(`\nDRY RUN: ${plan.length} tasks would change. Nothing was written.`); process.exit(0); }

  const backup = path.join(here, `aimeta-before-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(backup, `${JSON.stringify(plan.map(({ _id, title, before }) => ({ _id: String(_id), title, aiMeta: before })), null, 1)}\n`);
  for (const { _id, after } of plan) {
    await tasks.updateOne({ _id }, { $set: { 'aiMeta.symptoms': after.symptoms, 'aiMeta.whenToUse': after.whenToUse, 'aiMeta.neverUseWhen': after.neverUseWhen } });
  }
  console.log(`\nAPPLIED to ${plan.length} tasks. Previous values saved to ${backup}. Now run: node scripts/intake/export-logs.mjs --env <file> && npm run intake:replay -- --model`);
} finally {
  await client.close();
}
