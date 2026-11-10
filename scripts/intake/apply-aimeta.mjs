#!/usr/bin/env node
/**
 * Put scripts/intake/aimeta-proposal.json onto the live tasks' `aiMeta` — the text smart intake sends the model.
 *
 *   node scripts/intake/apply-aimeta.mjs --env <.env.production>            DRY RUN: prints before/after, writes nothing
 *   node scripts/intake/apply-aimeta.mjs --env <.env.production> --apply --owner-said-yes
 *   node scripts/intake/apply-aimeta.mjs --env <.env.production> --restore <backup file> --owner-said-yes   put it back
 *
 * A PRODUCTION WRITE. It does not run without both flags, and the second one is a statement: the owner has read the
 * dry run and said yes (CLAUDE.md, session rule 6; docs/goals/SMART_INTAKE.md, D1). It touches `aiMeta.symptoms`,
 * `aiMeta.whenToUse` and `aiMeta.neverUseWhen` on the tasks named in the proposal and nothing else, matches each
 * task by exact title, refuses if a title matches no task or more than one, and saves the previous values to
 * scripts/intake/aimeta-before-<timestamp>.json first. The backup is never overwritten: a second run the same day once
 * would have replaced the original with already-changed values (review, 2026-11-09).
 *
 * It also refuses when the live aiMeta no longer matches test/fixtures/smart-intake/catalog.json — the proposal was
 * measured against that file, so if production has moved on, re-export and re-measure first.
 *
 * Measure a proposal before asking: `npm run intake:replay -- --proposal`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient, ObjectId } from 'mongodb';

const here = path.dirname(fileURLToPath(import.meta.url));
const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : ''; };
const YES = process.argv.includes('--owner-said-yes');
const APPLY = process.argv.includes('--apply') && YES;
const RESTORE = arg('--restore');
if ((process.argv.includes('--apply') || RESTORE) && !YES) {
  console.error('--apply and --restore need --owner-said-yes as well. Nothing was written.');
  process.exit(1);
}
const envFile = arg('--env');
if (envFile) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    // The file named on the command line is the database you mean: it beats a MONGODB_URI left in the shell (review, 2026-11-09).
    if (m && (m[1] === 'MONGODB_URI' || !process.env[m[1]])) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}
if (!process.env.MONGODB_URI) { console.error('MONGODB_URI is not set. Pass --env <path to .env.production>.'); process.exit(1); }

const proposal = JSON.parse(fs.readFileSync(path.join(here, 'aimeta-proposal.json'), 'utf8'));
const titles = Object.keys(proposal).filter((k) => !k.startsWith('_'));

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
try {
  const tasks = client.db('efd-database').collection('tasks');

  if (RESTORE) {
    const saved = JSON.parse(fs.readFileSync(RESTORE, 'utf8'));
    for (const { _id, title, aiMeta } of saved) {
      // By the id the backup recorded — a task renamed since would be missed by title, or the wrong one hit (review, 2026-11-09).
      const res = await tasks.updateOne(_id ? { _id: new ObjectId(_id) } : { title, isActive: { $ne: false } }, { $set: { 'aiMeta.symptoms': aiMeta.symptoms || [], 'aiMeta.whenToUse': aiMeta.whenToUse || '', 'aiMeta.neverUseWhen': aiMeta.neverUseWhen || '' } });
      console.log(`${res.matchedCount ? 'restored' : 'NOT FOUND'}: ${title}`);
    }
    process.exit(0);
  }

  const fixture = new Map(JSON.parse(fs.readFileSync(path.join(here, '../../test/fixtures/smart-intake/catalog.json'), 'utf8')).map((t) => [t.title, t]));
  const same = (live = {}, fx = {}) => JSON.stringify([live.symptoms || [], live.whenToUse || '', live.neverUseWhen || ''])
    === JSON.stringify([fx.symptoms || [], fx.whenToUse || '', fx.neverUseWhen || '']);
  const plan = [];
  for (const title of titles) {
    const found = await tasks.find({ title, isActive: { $ne: false } }, { projection: { title: 1, aiMeta: 1 } }).toArray();
    if (found.length !== 1) { console.error(`"${title}": ${found.length} active tasks have this title. Nothing was written.`); process.exit(1); }
    if (!same(found[0].aiMeta, fixture.get(title))) {
      console.error(`"${title}": the live aiMeta is not what catalog.json holds, so the proposal was measured against something else. Re-export (node scripts/intake/export-logs.mjs) and re-measure (npm run intake:replay -- --proposal). Nothing was written.`);
      process.exit(1);
    }
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

  const backup = path.join(here, `aimeta-before-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  // 'wx': fail rather than overwrite. This file is the only copy of what production said before.
  fs.writeFileSync(backup, `${JSON.stringify(plan.map(({ _id, title, before }) => ({ _id: String(_id), title, aiMeta: before })), null, 1)}\n`, { flag: 'wx' });
  for (const { _id, after } of plan) {
    await tasks.updateOne({ _id }, { $set: { 'aiMeta.symptoms': after.symptoms, 'aiMeta.whenToUse': after.whenToUse, 'aiMeta.neverUseWhen': after.neverUseWhen } });
  }
  console.log(`\nAPPLIED to ${plan.length} tasks. Previous values saved to ${backup}. Now run: node scripts/intake/export-logs.mjs --env <file> && npm run intake:replay -- --model`);
} finally {
  await client.close();
}
