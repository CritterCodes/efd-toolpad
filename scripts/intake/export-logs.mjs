#!/usr/bin/env node
/**
 * Refresh the smart-intake replay fixtures from production. READ-ONLY: three finds, no writes.
 *
 *   node scripts/intake/export-logs.mjs --env <path to .env.production>
 *   (or set MONGODB_URI yourself)
 *
 * Writes test/fixtures/smart-intake/:
 *   intakes.json  every saved TYPED intake: what was typed, what the AI answered, what the ticket became
 *   photos.json   every saved PHOTO intake: the description the AI wrote and the ticket's metal
 *   catalog.json  the active task catalog exactly as smart intake sends it to the model
 *
 * Sanitized: no user names, no customer fields, no images. `marks.json` beside them is written by hand and is never
 * touched here (docs/goals/SMART_INTAKE.md, "The score").
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MongoClient } from 'mongodb';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, '../../test/fixtures/smart-intake');
const DB = 'efd-database';

const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : ''; };
const envFile = arg('--env');
if (envFile) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
  }
}
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI is not set. Pass --env <path to .env.production>.');
  process.exit(1);
}

const text = (v) => String(v ?? '').trim();
const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
try {
  const db = client.db(DB);
  const logs = await db.collection('smartIntakeLogs').find({ outcome: { $ne: null } }).sort({ createdAt: 1 }).toArray();
  const repairIDs = [...new Set(logs.map((l) => l.repairID).filter(Boolean))];
  const repairs = await db.collection('repairs')
    .find({ repairID: { $in: repairIDs } }, { projection: { repairID: 1, materials: 1 } }).toArray();
  const materialsOf = new Map(repairs.map((r) => [r.repairID, (r.materials || []).map((m) => ({
    name: text(m.displayName || m.name || m.title), quantity: Number(m.quantity) || 1,
  })).filter((m) => m.name)]));
  const tasks = await db.collection('tasks')
    .find({ isActive: { $ne: false } }, { projection: { title: 1, displayName: 1, aiMeta: 1, metals: 1 } }).toArray();

  const intakes = logs.filter((l) => l.kind === 'text').map((l) => ({
    id: l.logID,
    at: new Date(l.createdAt).toISOString().slice(0, 10),
    surface: l.surface,
    ticket: l.repairID || '',
    text: text(l.input?.text),
    description: text(l.input?.description),
    ai: l.output || {},
    saved: { ...l.outcome, materials: materialsOf.get(l.repairID) || [] },
  }));
  const photos = logs.filter((l) => l.kind === 'photo').map((l) => ({
    id: l.logID,
    at: new Date(l.createdAt).toISOString().slice(0, 10),
    description: text(l.output?.description),
    saved: { metalType: l.outcome?.metalType || '', karat: l.outcome?.karat || '', goldColor: l.outcome?.goldColor || '', isRing: !!l.outcome?.isRing },
  }));
  const catalog = tasks.map((t) => ({
    id: String(t._id),
    title: text(t.title || t.displayName),
    symptoms: t.aiMeta?.symptoms || [],
    whenToUse: t.aiMeta?.whenToUse || '',
    neverUseWhen: t.aiMeta?.neverUseWhen || '',
    ...(Array.isArray(t.metals) && t.metals.length ? { metals: t.metals } : {}),
  })).sort((a, b) => a.id.localeCompare(b.id));

  fs.mkdirSync(OUT, { recursive: true });
  const write = (name, data) => fs.writeFileSync(path.join(OUT, name), `${JSON.stringify(data, null, 1)}\n`);
  write('intakes.json', intakes);
  write('photos.json', photos);
  write('catalog.json', catalog);
  console.log(`typed intakes ${intakes.length} (${new Set(intakes.map((i) => i.ticket)).size} tickets), photos ${photos.length}, tasks ${catalog.length}`);
} finally {
  await client.close();
}
