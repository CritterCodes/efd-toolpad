/**
 * The smart-intake replay: real intakes from production, scored against what the ticket should have been.
 * docs/goals/SMART_INTAKE.md, "The score". Pure helpers; the tests and `npm run intake:replay` drive them.
 *
 * One row per TICKET (the last attempt for it — earlier attempts were retries). The answer is `decideIntake` over a
 * model answer, so the rulings in code are always part of what is measured.
 *
 * TWO numbers, always printed together, because they answer different questions (review, 2026-11-09):
 *   vs the rulings   the saved ticket, corrected by marks.json where he gave a break, entered a habit that is now a
 *                    ruling, or saved work the sentence never said. This is what the system is built to hit.
 *   vs what he saved the saved ticket exactly as it was. Lower by design — it counts his breaks as misses — but it is
 *                    the number no ruling of ours can flatter. If the gap grows, the marks are drifting from the shop.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { decideIntake, parseRingSize, buildIntakePrompt } from '@/services/ai/smartIntakeRules';

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

/** A fingerprint of everything the model is sent except the note itself: every word of the prompt, and the task list. */
export const promptHashFor = (catalog) => crypto.createHash('sha256')
  .update(buildIntakePrompt({ inputText: 'NOTE', description: 'DESCRIPTION', tasks: catalog, todayIso: 'TODAY' })).digest('hex').slice(0, 12);

/**
 * The tuning set ends here. The rulings, the marks and the prompt were all written against the tickets up to this
 * date, so a score on them says how well the system fits what it was built from — not how it will do next month
 * (review, 2026-11-09: "there is no held-out data"). Tickets saved AFTER this date are scored separately as "fresh":
 * printed, never ratcheted, and never to be tuned against. Only that number predicts anything.
 */
export const TUNED_UNTIL = '2026-11-09';

/** The last attempt for each ticket, in order. */
export function lastAttemptPerTicket(intakes = []) {
  const last = new Map();
  for (const intake of intakes) last.set(intake.ticket || intake.id, intake);
  return [...last.values()];
}

const lineKey = (lines = []) => lines.map((l) => `${l.id}x${l.quantity || 1}`).sort().join(',');
const setKey = (lines = []) => [...new Set(lines.map((l) => l.id))].sort().join(',');
const sameSize = (a, b) => (parseRingSize(a) ?? '') === (parseRingSize(b) ?? '');
const label = (lines, titleOf) => lines.map((l) => `${titleOf.get(l.id) || l.title || l.id || '?'}${(l.quantity || 1) > 1 ? ` x${l.quantity}` : ''}`).join(' + ') || '—';
const savedLines = (intake) => (intake.saved.tasks || []).map((t) => ({ id: t.id, title: t.title, quantity: t.quantity || 1 }));

/**
 * What the ticket should have been.
 *   skip     nobody could say what the right answer is: excluded.
 *   expect   .tasks replaces the saved tasks ({} = "suggest nothing": the work was never said);
 *            .stock is the sizing stock the owner's rule gives (0 when absent);
 *            .sizes replaces the saved sizes ([current, desired]);
 *            .ignore lists fields the sentence never gave ("metal", "sizes"), which are then not scored.
 * Without a mark the saved ticket is the answer and no sizing stock is expected. A task name the catalog doesn't have
 * throws — the fixtures and the catalog must agree.
 */
export function expectedFor(intake, marks = {}, catalog = []) {
  const mark = marks[intake.id] || {};
  if (mark.skip) return { skip: mark.skip };
  const byTitle = new Map(catalog.map((t) => [t.title, t.id]));
  const e = mark.expect || {};
  let tasks;
  if (e.tasks) {
    tasks = Object.entries(e.tasks).map(([title, quantity]) => {
      if (!byTitle.has(title)) throw new Error(`marks.json ${intake.id}: no task titled "${title}" in catalog.json`);
      return { id: byTitle.get(title), quantity };
    });
  } else {
    tasks = savedLines(intake);
  }
  const sizes = e.sizes || [intake.saved.currentRingSize, intake.saved.desiredRingSize];
  // Sizing stock: the mark's when there is one; otherwise what he actually put on the ticket. (It used to be 0 for
  // every unmarked ticket, so a ticket where the rule rightly added stock would have failed — review, 2026-11-09.)
  const savedStock = (intake.saved.materials || []).filter((m) => /sizing stock/i.test(m.name || '')).reduce((n, m) => n + (Number(m.quantity) || 0), 0);
  const stock = mark.expect ? (e.stock || 0) : savedStock;
  return { tasks, stock, sizes, ignore: e.ignore || [], marked: !!mark.expect, saved: intake.saved };
}

/** The model answer to replay for an intake as it was logged at the time (`raw` when the log kept it). */
export const loggedAnswer = (intake) => intake.ai?.raw || intake.ai || {};

/** Score a set of model answers through today's rulings. `answerFor(intake)` returns the raw model answer. */
export function scoreReplay({ intakes, marks, catalog }, answerFor = loggedAnswer) {
  const titleOf = new Map(catalog.map((t) => [t.id, t.title]));
  const rows = [];
  for (const intake of lastAttemptPerTicket(intakes)) {
    const want = expectedFor(intake, marks, catalog);
    if (want.skip) { rows.push({ id: intake.id, text: intake.text, skip: want.skip }); continue; }
    const got = decideIntake(answerFor(intake), { tasks: catalog, inputText: intake.text });
    const stock = (got.materialHints || []).filter((h) => h.type === 'sizing_material').reduce((n, h) => n + h.quantity, 0);
    const saved = want.saved;
    const ok = {
      tasks: lineKey(got.matchedTasks) === lineKey(want.tasks),
      taskSet: setKey(got.matchedTasks) === setKey(want.tasks),
      sizes: want.ignore.includes('sizes') || (sameSize(got.currentRingSize, want.sizes[0]) && sameSize(got.desiredRingSize, want.sizes[1])),
      metal: want.ignore.includes('metal') || (got.metalType === (saved.metalType || '') && (got.goldColor || '') === (saved.goldColor || '')
        && (!saved.karat || got.karat === saved.karat)),
      stock: stock === want.stock,
    };
    ok.all = Object.values(ok).every(Boolean);
    rows.push({
      id: intake.id, text: intake.text, ok, marked: want.marked, fresh: intake.at > TUNED_UNTIL,
      asSaved: lineKey(got.matchedTasks) === lineKey(savedLines(intake)),
      fields: `got ${got.metalType}/${got.karat}/${got.goldColor} ${got.currentRingSize}>${got.desiredRingSize}, want ${saved.metalType}/${saved.karat}/${saved.goldColor} ${want.sizes[0]}>${want.sizes[1]}`,
      got: `${label(got.matchedTasks, titleOf)}${stock ? ` | stock x${stock}` : ''}`,
      want: `${label(want.tasks, titleOf)}${want.stock ? ` | stock x${want.stock}` : ''}`,
    });
  }
  const fresh = rows.filter((r) => !r.skip && r.fresh);
  const scored = rows.filter((r) => !r.skip && !r.fresh);
  const count = (key) => scored.filter((r) => r.ok[key]).length;
  return {
    rows,
    // Tickets saved after the tuning set closed: the only score nobody could have fitted the rules to.
    fresh: { tickets: fresh.length, tasks: fresh.filter((r) => r.ok.tasks).length, asSaved: fresh.filter((r) => r.asSaved).length, all: fresh.filter((r) => r.ok.all).length },
    totals: {
      tickets: scored.length, skipped: rows.filter((r) => r.skip).length,
      tasks: count('tasks'), taskSet: count('taskSet'), sizes: count('sizes'), metal: count('metal'), stock: count('stock'), all: count('all'),
      asSaved: scored.filter((r) => r.asSaved).length,
      // The tickets that are right today. The ratchet is on THESE, not on the count: fixing one ticket while breaking
      // another keeps the count and must still fail (review, 2026-11-09).
      passing: scored.filter((r) => r.ok.all).map((r) => r.id).sort(),
    },
  };
}

// asSaved is ratcheted too: it is the number the marks cannot flatter, and it used to be free to fall (review, 2026-11-09).
export const METRICS = ['tasks', 'taskSet', 'sizes', 'metal', 'stock', 'all', 'asSaved'];

/** Tickets that were right in the recorded run and are not now. */
export const regressions = (before, totals) => (before?.passing || []).filter((id) => !totals.passing.includes(id));

/** A printable report: the totals, then every ticket that is not right. */
export function report(name, { rows, totals, fresh }, before = null) {
  const pct = (n, d) => (d ? ` (${Math.round((100 * n) / d)}%)` : '');
  const lines = [`\n== ${name}: ${totals.tickets} tickets in the tuning set (${totals.skipped} skipped: nobody could say what was right) ==`];
  lines.push(fresh?.tickets
    // Fresh tickets carry no hand marks, so their "vs the rulings" is really "vs what he saved". The honest comparison is
    // as-saved against as-saved: the tuning set's rate beside the fresh one (review, 2026-11-09).
    ? `FRESH tickets (saved after ${TUNED_UNTIL}, never tuned against): ${fresh.asSaved}/${fresh.tickets}${pct(fresh.asSaved, fresh.tickets)} vs what he saved — the tuning set is ${totals.asSaved}/${totals.tickets}${pct(totals.asSaved, totals.tickets)} on the same measure  <- the number that predicts`
    : `FRESH tickets (saved after ${TUNED_UNTIL}): none yet. Refresh the fixtures to get some: node scripts/intake/export-logs.mjs`);
  const was = (k) => (before && before[k] !== undefined && before[k] !== totals[k] ? ` (was ${before[k]})` : '');
  lines.push(`vs the rulings — same tasks and quantities  ${totals.tasks}/${totals.tickets}${was('tasks')}   <- headline; a FIT, not a forecast: these tickets are the ones the rules were written on`);
  lines.push(`vs what he saved — same tasks and quantities ${totals.asSaved}/${totals.tickets}${was('asSaved')}   <- counts his breaks as misses`);
  lines.push(`same tasks, any quantity   ${totals.taskSet}/${totals.tickets}${was('taskSet')}`);
  lines.push(`same ring sizes            ${totals.sizes}/${totals.tickets}${was('sizes')}`);
  lines.push(`same metal, karat, colour  ${totals.metal}/${totals.tickets}${was('metal')}`);
  lines.push(`same sizing stock          ${totals.stock}/${totals.tickets}${was('stock')}`);
  lines.push(`everything right           ${totals.all}/${totals.tickets}${was('all')}`);
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const id of regressions(before, totals)) lines.push(`  !! was right, now wrong: "${(byId.get(id)?.text || id).slice(0, 80)}"`);
  for (const id of totals.passing.filter((x) => before?.passing && !before.passing.includes(x))) lines.push(`  ++ was wrong, now right: "${(byId.get(id)?.text || id).slice(0, 80)}"`);
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
