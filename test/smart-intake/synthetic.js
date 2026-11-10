/**
 * The made-up set (syntheticCases.js) scored the way the real tickets are: a model answer through `decideIntake`,
 * compared with what the ticket should be. Kept apart from the real replay on purpose — its own answers file, its own
 * score file, its own report — so a made-up note can never move the real score.
 *
 * Two groups:
 *   settled   the expected answer follows from a task description or an owner ruling. Ratcheted by case.
 *   rulings   the expected answer is a guess until the owner rules. Printed with the question; never ratcheted.
 */
import { decideIntake } from '@/services/ai/smartIntakeRules';
import { SYNTHETIC_CASES } from './syntheticCases.js';
import { scoreReplay, TUNED_UNTIL } from './replay.js';

/** The made-up cases in the shape the replay scores: an intake and a mark each. */
export function syntheticFixtures(catalog = [], cases = SYNTHETIC_CASES) {
  const seen = new Set();
  const intakes = [];
  const marks = {};
  for (const c of cases) {
    if (seen.has(c.id)) throw new Error(`syntheticCases.js: the note "${c.text}" is there twice`);
    seen.add(c.id);
    const [metalType = '', karat = '', goldColor = ''] = c.metal || [];
    const [currentRingSize = '', desiredRingSize = ''] = c.sizes || [];
    intakes.push({
      id: c.id, at: TUNED_UNTIL, text: c.text, description: '',
      saved: { metalType, karat, goldColor, currentRingSize, desiredRingSize, tasks: [], materials: [] },
    });
    marks[c.id] = {
      expect: { tasks: c.tasks, stock: c.stock || 0, ignore: [!c.metal && 'metal', !c.sizes && 'sizes'].filter(Boolean) },
    };
  }
  return { intakes, marks, catalog };
}

/** Score the made-up set. `answerFor(intake)` returns the raw model answer for a note. */
export function scoreSynthetic(catalog, answerFor, cases = SYNTHETIC_CASES) {
  const fx = syntheticFixtures(catalog, cases);
  const caseOf = new Map(cases.map((c) => [c.id, c]));
  const intakeOf = new Map(fx.intakes.map((i) => [i.id, i]));
  const rows = scoreReplay(fx, answerFor).rows.map((row) => {
    const warnings = decideIntake(answerFor(intakeOf.get(row.id)), { tasks: catalog, inputText: row.text }).warnings || [];
    return { ...row, ruling: caseOf.get(row.id).ruling || '', expects: Object.keys(caseOf.get(row.id).tasks), warnings };
  });
  const settled = rows.filter((r) => !r.ruling);
  const byTask = new Map(catalog.map((t) => [t.title, { cases: 0, right: 0 }]));
  for (const row of settled) {
    for (const title of row.expects) {
      const tally = byTask.get(title);
      tally.cases += 1;
      if (row.ok.all) tally.right += 1;
    }
  }
  return {
    rows,
    byTask,
    totals: {
      cases: settled.length,
      tasks: settled.filter((r) => r.ok.tasks).length,
      all: settled.filter((r) => r.ok.all).length,
      // Wrong, and nothing on the screen said so: the kind that costs money.
      silent: settled.filter((r) => !r.ok.all && !r.warnings.length).length,
      rulings: rows.length - settled.length,
      passing: settled.filter((r) => r.ok.all).map((r) => r.id).sort(),
    },
  };
}

/** Cases that were right in the recorded run and are not now. */
export const syntheticRegressions = (before, totals) => (before?.passing || []).filter((id) => !totals.passing.includes(id));

export function syntheticReport(name, { rows, byTask, totals }, before = null) {
  const was = (k) => (before && before[k] !== undefined && before[k] !== totals[k] ? ` (was ${before[k]})` : '');
  const lines = [`\n== MADE-UP notes, ${name}: ${totals.cases} with a settled answer, ${totals.rulings} waiting on a ruling ==`];
  lines.push(`same tasks and quantities  ${totals.tasks}/${totals.cases}${was('tasks')}`);
  lines.push(`everything right           ${totals.all}/${totals.cases}${was('all')}`);
  lines.push(`wrong with NO warning      ${totals.silent}${was('silent')}   <- the ones that would reach a price unseen`);
  const byId = new Map(rows.map((r) => [r.id, r]));
  for (const id of syntheticRegressions(before, totals)) lines.push(`  !! was right, now wrong: "${byId.get(id)?.text || id}"`);
  const wrong = (r) => {
    const what = [!r.ok.tasks && 'tasks', !r.ok.stock && 'stock', !r.ok.sizes && 'sizes', !r.ok.metal && 'metal'].filter(Boolean).join(', ');
    const detail = r.ok.tasks && r.ok.stock ? r.fields : `got:  ${r.got}\n      want: ${r.want}`;
    return `  ${r.warnings.length ? 'x' : 'X'} "${r.text}" — wrong ${what}${r.warnings.length ? '' : ' — NO WARNING'}\n      ${detail}`;
  };
  for (const r of rows.filter((x) => !x.ruling && !x.ok.all)) lines.push(wrong(r));
  lines.push('\n  -- waiting on a ruling (the "want" is a guess) --');
  for (const r of rows.filter((x) => x.ruling)) {
    lines.push(`  ? "${r.text}"\n      ${r.ruling}\n      got: ${r.got}${r.warnings.length ? '  (warned)' : ''}   guess: ${r.want}`);
  }
  lines.push('\n  -- by task: made-up cases that expect it, and how many are right --');
  for (const [title, tally] of byTask) lines.push(`  ${String(tally.right).padStart(3)}/${String(tally.cases).padEnd(3)} ${title}`);
  return lines.join('\n');
}
