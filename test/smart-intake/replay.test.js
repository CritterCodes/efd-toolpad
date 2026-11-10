/**
 * Smart intake replay, rules mode — runs in `npm test`, calls nothing.
 *
 * Two sets of model answers go through TODAY'S rulings and are scored against what each ticket should have been:
 *   logged   what the model answered at the time (old prompt, old task list)
 *   model    what the model answered the last time `npm run intake:replay -- --model` ran (model-answers.json)
 *
 * A ratchet: no recorded number may go down. After a change that moves a number for a good reason, run
 * `npm run intake:replay -- --update` and say in the goal file's Round log which tickets flipped and why.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { FIXTURES, METRICS, loadFixtures, scoreReplay, report, photoContradictions, loggedAnswer } from './replay.js';

const fx = loadFixtures();
const UPDATE = process.env.INTAKE_UPDATE === '1';

const runs = { logged: scoreReplay(fx) };
if (fx.modelAnswers?.answers) {
  runs.model = scoreReplay(fx, (intake) => fx.modelAnswers.answers[intake.id] || loggedAnswer(intake));
}

describe('smart intake replay (rules mode)', () => {
  for (const [name, run] of Object.entries(runs)) {
    it(`${name}: no score goes down`, () => {
      const before = fx.recorded[name] || null;
      console.log(report(name, run, before));
      if (UPDATE || !before) return;
      for (const metric of METRICS) {
        expect(run.totals[metric], `${name}.${metric} was ${before[metric]} — see docs/goals/SMART_INTAKE.md, "The score"`)
          .toBeGreaterThanOrEqual(before[metric]);
      }
      expect(run.totals.tickets, 'the number of scored tickets changed — re-record with --update').toBe(before.tickets);
    });
  }

  it('photo descriptions: how many contradict the ticket\'s metal (goal G1, lower is better)', () => {
    const now = photoContradictions(fx.photos);
    console.log(`\n== photos: ${now.contradict} of ${now.named} descriptions that name a metal colour contradict the ticket ==`);
    expect(now.named).toBeGreaterThan(0);
  });

  it('records the score when asked', () => {
    if (!UPDATE) return;
    const next = { ...fx.recorded };
    for (const [name, run] of Object.entries(runs)) next[name] = run.totals;
    next.photos = photoContradictions(fx.photos);
    fs.writeFileSync(path.join(FIXTURES, 'score.json'), `${JSON.stringify(next, null, 1)}\n`);
    console.log('\nscore.json updated');
  });
});
