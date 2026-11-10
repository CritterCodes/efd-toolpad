/**
 * The smart-intake replay: real intakes from production, scored against what the ticket should have been.
 * docs/goals/SMART_INTAKE.md, "The score". Pure helpers; the tests and `npm run intake:replay` drive them.
 *
 * One row per TICKET (the last attempt for it — earlier attempts were retries). The answer is `decideIntake` over a
 * model answer, so the rulings in code are always part of what is measured.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { decideIntake, parseRingSize } from '@/services/ai/smartIntakeRules';

export const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/smart-intake');
const read = (name, fallback) => {
  const file = path.join(FIXTURES, name);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
};

export function loadFixtures() {
  return {
    intakes: read('intakes.json', []),
    photos: read('photos.json', []),
    catalog: read('catalog.json', []),
    marks: read('marks.json', {}),
    modelAnswers: read('model-answers.json', null),
    recorded: read('score.json', {}),
  };
}

/** The last attempt for each ticket, in order. */
export function lastAttemptPerTicket(intakes = []) {
  const last = new Map();
  for (const intake of intakes) last.set(intake.ticket || intake.id, intake);
  return [...last.values()];
}

const lineKey = (lines = []) => lines.map((l) => `${l.id}x${l.quantity || 1}`).sort().join(',');
const setKey = (lines = []) => [...new Set(lines.map((l) => l.id))].sort().join(',');
const sameSize = (a, b) => (parseRingSize(a) ?? '') === (parseRingSize(b) ?? '');
const label = (lines, titleOf) => lines.map((l) => `${titleOf.get(l.id) || l.id}${(l.quantity || 1) > 1 ? ` x${l.quantity}` : ''}`).join(' + ') || '—';

/**
 * What the ticket should have been. A `skip` mark means nobody could know. An `expect` mark replaces the saved tasks
 * (and gives the sizing stock); without one the saved ticket is the answer and no sizing stock is expected. A task
 * name in a mark that the catalog doesn't have throws — the fixtures and the catalog must agree.
 */
export function expectedFor(intake, marks = {}, catalog = []) {
  const mark = marks[intake.id] || {};
  if (mark.skip) return { skip: mark.skip };
  const byTitle = new Map(catalog.map((t) => [t.title, t.id]));
  let tasks;
  if (mark.expect?.tasks) {
    tasks = Object.entries(mark.expect.tasks).map(([title, quantity]) => {
      if (!byTitle.has(title)) throw new Error(`marks.json ${intake.id}: no task titled "${title}" in catalog.json`);
      return { id: byTitle.get(title), quantity };
    });
  } else {
    tasks = (intake.saved.tasks || []).map((t) => ({ id: t.id, quantity: t.quantity || 1 }));
  }
  // `sizesUnsaid`: the sizes on the ticket were typed by hand; the sentence only gave the change ("up 2 sizes").
  return { tasks, stock: mark.expect?.stock || 0, sizesUnsaid: !!mark.expect?.sizesUnsaid, saved: intake.saved };
}

/** The model answer to replay for an intake: a fresh one when given, else what was logged at the time. */
export const loggedAnswer = (intake) => intake.ai?.raw || intake.ai || {};

/** Score a set of model answers through today's rulings. `answerFor(intake)` returns the raw model answer. */
export function scoreReplay({ intakes, marks, catalog }, answerFor = loggedAnswer) {
  const titleOf = new Map(catalog.map((t) => [t.id, t.title]));
  const rows = [];
  for (const intake of lastAttemptPerTicket(intakes)) {
    const want = expectedFor(intake, marks, catalog);
    if (want.skip) { rows.push({ id: intake.id, text: intake.text, skip: want.skip }); continue; }
    const got = decideIntake(answerFor(intake), { tasks: catalog, inputText: intake.text, description: intake.description });
    const stock = (got.materialHints || []).filter((h) => h.type === 'sizing_material').reduce((n, h) => n + h.quantity, 0);
    const saved = want.saved;
    const ok = {
      tasks: lineKey(got.matchedTasks) === lineKey(want.tasks),
      taskSet: setKey(got.matchedTasks) === setKey(want.tasks),
      sizes: want.sizesUnsaid
        ? !got.currentRingSize && !got.desiredRingSize
        : sameSize(got.currentRingSize, saved.currentRingSize) && sameSize(got.desiredRingSize, saved.desiredRingSize),
      metal: got.metalType === (saved.metalType || '') && (got.goldColor || '') === (saved.goldColor || '')
        && (!saved.karat || got.karat === saved.karat),
      stock: stock === want.stock,
    };
    ok.all = Object.values(ok).every(Boolean);
    rows.push({
      id: intake.id, text: intake.text, ok,
      fields: `got ${got.metalType}/${got.karat}/${got.goldColor} ${got.currentRingSize}>${got.desiredRingSize}, saved ${saved.metalType}/${saved.karat}/${saved.goldColor} ${saved.currentRingSize}>${saved.desiredRingSize}`,
      got: `${label(got.matchedTasks, titleOf)}${stock ? ` | stock x${stock}` : ''}`,
      want: `${label(want.tasks, titleOf)}${want.stock ? ` | stock x${want.stock}` : ''}`,
    });
  }
  const scored = rows.filter((r) => !r.skip);
  const count = (key) => scored.filter((r) => r.ok[key]).length;
  return {
    rows,
    totals: {
      tickets: scored.length, skipped: rows.length - scored.length,
      tasks: count('tasks'), taskSet: count('taskSet'), sizes: count('sizes'), metal: count('metal'), stock: count('stock'), all: count('all'),
    },
  };
}

export const METRICS = ['tasks', 'taskSet', 'sizes', 'metal', 'stock', 'all'];

/** A printable report: the totals, then every ticket whose tasks or stock are wrong. */
export function report(name, { rows, totals }, before = null) {
  const lines = [`\n== ${name}: ${totals.tickets} tickets scored (${totals.skipped} unknowable, skipped) ==`];
  const was = (k) => (before && before[k] !== undefined && before[k] !== totals[k] ? ` (was ${before[k]})` : '');
  lines.push(`same tasks and quantities  ${totals.tasks}/${totals.tickets}${was('tasks')}   <- headline`);
  lines.push(`same tasks, any quantity   ${totals.taskSet}/${totals.tickets}${was('taskSet')}`);
  lines.push(`same ring sizes            ${totals.sizes}/${totals.tickets}${was('sizes')}`);
  lines.push(`same metal, karat, colour  ${totals.metal}/${totals.tickets}${was('metal')}`);
  lines.push(`same sizing stock          ${totals.stock}/${totals.tickets}${was('stock')}`);
  lines.push(`everything right           ${totals.all}/${totals.tickets}${was('all')}`);
  for (const r of rows.filter((x) => !x.skip && !(x.ok.tasks && x.ok.stock))) {
    lines.push(`  x "${r.text.slice(0, 80)}"\n      got:  ${r.got}\n      want: ${r.want}`);
  }
  for (const r of rows.filter((x) => !x.skip && x.ok.tasks && x.ok.stock && !x.ok.all)) {
    lines.push(`  ~ "${r.text.slice(0, 80)}" — wrong ${['sizes', 'metal'].filter((k) => !r.ok[k]).join(' and ')}: ${r.fields}`);
  }
  return lines.join('\n');
}

/** Photo descriptions that name a metal colour the ticket contradicts (goal file, G1). Text only. */
export function photoContradictions(photos = []) {
  const says = (d) => {
    const t = d.toLowerCase();
    if (/\b(yellow gold|gold-toned|gold-tone|yellow)\b/.test(t)) return 'yellow';
    if (/\b(rose gold|rose-toned|pink)\b/.test(t)) return 'rose';
    if (/\b(silver-toned|silver-tone|white gold|white metal|silver|platinum)\b/.test(t)) return 'white';
    return '';
  };
  const ticket = (s) => (s.metalType === 'gold' ? (s.goldColor || '') : (s.metalType ? 'white' : ''));
  const named = photos.filter((p) => says(p.description) && ticket(p.saved));
  return { named: named.length, contradict: named.filter((p) => says(p.description) !== ticket(p.saved)).length };
}
