/**
 * The made-up notes, rules mode — runs in `npm test`, calls nothing. Today's rulings over the model's stored answers
 * to the made-up set (synthetic-answers.json), scored and ratcheted apart from the real tickets.
 *
 *   npm run intake:replay -- --model     asks the model about the real AND the made-up notes
 *   npm run intake:replay -- --update    records both scores
 *
 * A made-up case that was right in synthetic-score.json must still be right. Cases waiting on an owner ruling are
 * printed and never ratcheted.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { FIXTURES, loadFixtures, promptHashFor } from './replay.js';
import { SYNTHETIC_CASES } from './syntheticCases.js';
import { scoreSynthetic, syntheticReport, syntheticRegressions } from './synthetic.js';

const fx = loadFixtures();
const read = (name) => (fs.existsSync(path.join(FIXTURES, name)) ? JSON.parse(fs.readFileSync(path.join(FIXTURES, name), 'utf8')) : null);
const stored = read('synthetic-answers.json');
const recorded = read('synthetic-score.json');
const UPDATE = process.env.INTAKE_UPDATE === '1';

describe('smart intake, made-up notes (rules mode)', () => {
  it('every expected task is in the catalog, and no note is there twice', () => {
    expect(() => scoreSynthetic(fx.catalog, () => ({}))).not.toThrow();
  });

  it('the model has answered every made-up note with today\'s prompt and task list', () => {
    expect(stored, 'no synthetic-answers.json — run: npm run intake:replay -- --model').toBeTruthy();
    expect(stored.promptHash, 'the prompt or the task list changed since the model was last asked — run: npm run intake:replay -- --model')
      .toBe(promptHashFor(fx.catalog));
    expect(SYNTHETIC_CASES.filter((c) => !stored.answers[c.id]).map((c) => c.text), 'made-up notes the model was never asked about — run: npm run intake:replay -- --model').toEqual([]);
  });

  it('every made-up case that was right is still right', () => {
    if (!stored) return;
    const run = scoreSynthetic(fx.catalog, (intake) => stored.answers[intake.id] || {});
    console.log(syntheticReport(`${stored.model}`, run, recorded));
    if (UPDATE) {
      fs.writeFileSync(path.join(FIXTURES, 'synthetic-score.json'), `${JSON.stringify(run.totals, null, 1)}\n`);
      console.log('\nsynthetic-score.json updated');
      return;
    }
    if (!recorded) return;
    expect(syntheticRegressions(recorded, run.totals), 'made-up cases that were right in synthetic-score.json and are wrong now').toEqual([]);
  });
});
