/**
 * Smart intake replay, rules mode — runs in `npm test`, calls nothing.
 *
 * Two sets of model answers go through TODAY'S rulings and are scored against what each ticket should have been:
 *   logged   what the model answered at the time (old prompt, old task list)
 *   model    what the model answered the last time `npm run intake:replay -- --model` ran (model-answers.json)
 *
 * The ratchet (docs/goals/SMART_INTAKE.md, "The score"):
 *   - every ticket that was right in score.json must still be right — by ticket, not by count;
 *   - no count may go down;
 *   - the stored model answers must have been made with today's prompt and task list. Change either and this fails
 *     until `npm run intake:replay -- --model` has asked the model again.
 * After a change that moves a ticket for a good reason, run `npm run intake:replay -- --update` and say in the goal
 * file's Round log which tickets flipped and why. `--update` records; it never skips the stale-prompt check.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { FIXTURES, METRICS, loadFixtures, scoreReplay, report, photoContradictions, promptHashFor, regressions, lastAttemptPerTicket, expectedFor } from './replay.js';

const fx = loadFixtures();
const UPDATE = process.env.INTAKE_UPDATE === '1';

const runs = { logged: scoreReplay(fx) };
if (fx.modelAnswers?.answers) {
  // No fallback: a ticket the model was never asked about is a hole in the run, not a logged answer in disguise.
  runs.model = scoreReplay(fx, (intake) => {
    const answer = fx.modelAnswers.answers[intake.id];
    if (!answer) throw new Error(`model-answers.json has no answer for ${intake.id} ("${intake.text}"). Run: npm run intake:replay -- --model`);
    return answer;
  });
}

describe('smart intake replay (rules mode)', () => {
  it('the stored model answers were made with today\'s prompt and task list', () => {
    expect(fx.modelAnswers, 'no model-answers.json — run: npm run intake:replay -- --model').toBeTruthy();
    expect(fx.modelAnswers.promptHash, 'the prompt or the task list changed since the model was last asked — run: npm run intake:replay -- --model')
      .toBe(promptHashFor(fx.catalog));
    const scored = lastAttemptPerTicket(fx.intakes).filter((i) => !expectedFor(i, fx.marks, fx.catalog).skip);
    expect(scored.filter((i) => !fx.modelAnswers.answers[i.id]).map((i) => i.text)).toEqual([]);
  });

  for (const [name, run] of Object.entries(runs)) {
    it(`${name}: every ticket that was right is still right, and no count goes down`, () => {
      const before = fx.recorded[name] || null;
      console.log(report(name, run, before));
      if (UPDATE || !before) return;
      expect(regressions(before, run.totals), `${name}: tickets that were right in score.json and are wrong now`).toEqual([]);
      for (const metric of METRICS) {
        expect(run.totals[metric], `${name}.${metric} was ${before[metric]}`).toBeGreaterThanOrEqual(before[metric]);
      }
    });
  }

  it('photo descriptions that contradict the ticket\'s metal do not increase (goal G1)', () => {
    const now = photoContradictions(fx.photos);
    console.log(`\n== photos: ${now.contradict} of ${now.named} descriptions that name a metal colour contradict the ticket ==`);
    if (UPDATE || !fx.recorded.photos) return;
    expect(now.contradict).toBeLessThanOrEqual(fx.recorded.photos.contradict);
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
