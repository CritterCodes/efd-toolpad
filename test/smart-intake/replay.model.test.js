/**
 * Smart intake replay, MODEL mode — calls Gemini, so it never runs in `npm test`. Run it with
 * `npm run intake:replay -- --model` (docs/goals/SMART_INTAKE.md, "The score").
 *
 * Sends today's prompt for every scored ticket, saves the raw answers to model-answers.json (committed, so the rules
 * replay in `npm test` then scores today's rulings over them), and prints the score. Any API error ABORTS the run: a
 * failed call is never scored as an empty answer (that is how a dead key once read as "3 of 77").
 *
 * The key: GEMINI_API_KEY in the environment, or in a gitignored `.env.replay.local` at the repo root.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'vitest';
import { buildIntakePrompt, INTAKE_MODEL } from '@/services/ai/smartIntakeRules';
import { FIXTURES, loadFixtures, lastAttemptPerTicket, expectedFor, scoreReplay, report, promptHashFor } from './replay.js';
import { withTaskIds } from '@/services/ai/smartIntakePrompt';
import { syntheticFixtures, scoreSynthetic, syntheticReport } from './synthetic.js';

const MODEL = INTAKE_MODEL;
const RUN = process.env.INTAKE_MODEL === '1';
// `--proposal`: score the PROPOSED aiMeta (scripts/intake/aimeta-proposal.json) laid over the live catalog, without
// writing anything. This is how a metadata rewrite is measured before the owner is asked to approve it.
const PROPOSAL = process.env.INTAKE_PROPOSAL === '1';

const withProposal = (catalog) => {
  const proposal = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'scripts/intake/aimeta-proposal.json'), 'utf8'));
  const titles = new Set(catalog.map((t) => t.title));
  for (const title of Object.keys(proposal)) {
    if (!title.startsWith('_') && !titles.has(title)) throw new Error(`aimeta-proposal.json: no task titled "${title}" in catalog.json`);
  }
  return catalog.map((t) => (proposal[t.title] ? { ...t, ...proposal[t.title] } : t));
};

const apiKey = () => {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const file = path.resolve(process.cwd(), '.env.replay.local');
  if (!fs.existsSync(file)) return '';
  const m = fs.readFileSync(file, 'utf8').match(/^GEMINI_API_KEY="?([^"\r\n]+)/m);
  return m ? m[1] : '';
};

async function ask(prompt, key) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 8000, responseMimeType: 'application/json' }, // as the route sends it
      }),
    });
    const body = await res.json();
    if (res.ok) {
      const text = (body.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start < 0 || end <= start) throw new Error(`Gemini answered something that is not JSON: ${text.slice(0, 120)}`);
      return { answer: JSON.parse(text.slice(start, end + 1)), version: body.modelVersion || MODEL };
    }
    if ((res.status === 429 || res.status === 503) && attempt < 4) {
      await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
      continue;
    }
    throw new Error(`Gemini ${res.status}: ${body?.error?.message || 'request failed'} — the replay stops here; nothing was scored.`);
  }
}

/** Today's prompt for every intake in the list, five at a time. */
async function askAll(list, catalog, key) {
  const answers = {};
  let version = MODEL;
  const queue = [...list];
  const worker = async () => {
    while (queue.length) {
      const intake = queue.shift();
      const prompt = buildIntakePrompt({ inputText: intake.text, description: intake.description, tasks: catalog, todayIso: intake.at });
      const got = await ask(prompt, key);
      answers[intake.id] = withTaskIds(got.answer, catalog); // stored with task ids, as the route logs them
      version = got.version;
    }
  };
  await Promise.all(Array.from({ length: 5 }, worker));
  return { answers: Object.fromEntries(Object.keys(answers).sort().map((id) => [id, answers[id]])), version };
}

describe.skipIf(!RUN)('smart intake replay (model mode)', () => {
  // The made-up notes (syntheticCases.js): asked the same way, stored and scored apart from the real tickets.
  it.skipIf(PROPOSAL)('asks the model about every made-up note', async () => {
    const key = apiKey();
    if (!key) throw new Error('No GEMINI_API_KEY. See docs/goals/SMART_INTAKE.md, "The score", for where to get it.');
    const { catalog } = loadFixtures();
    const { answers, version } = await askAll(syntheticFixtures(catalog).intakes, catalog, key);
    fs.writeFileSync(path.join(FIXTURES, 'synthetic-answers.json'),
      `${JSON.stringify({ model: version, promptHash: promptHashFor(catalog), at: new Date().toISOString().slice(0, 10), answers }, null, 1)}\n`);
    console.log(syntheticReport(version, scoreSynthetic(catalog, (intake) => answers[intake.id])));
  }, 1800000);

  it('asks the model about every scored ticket and scores the answers', async () => {
    const key = apiKey();
    if (!key) throw new Error('No GEMINI_API_KEY. See docs/goals/SMART_INTAKE.md, "The score", for where to get it.');
    const fx = loadFixtures();
    const catalog = PROPOSAL ? withProposal(fx.catalog) : fx.catalog;
    const todo = lastAttemptPerTicket(fx.intakes).filter((i) => !expectedFor(i, fx.marks, fx.catalog).skip);
    const { answers, version } = await askAll(todo, catalog, key);

    const run = scoreReplay(fx, (intake) => answers[intake.id]);
    if (PROPOSAL) {
      console.log(report(`PROPOSED aiMeta (${version}) — nothing written`, run, fx.recorded.model || null));
      return;
    }
    const promptHash = promptHashFor(fx.catalog);
    const sorted = Object.fromEntries(Object.keys(answers).sort().map((id) => [id, answers[id]]));
    fs.writeFileSync(path.join(FIXTURES, 'model-answers.json'),
      `${JSON.stringify({ model: version, promptHash, at: new Date().toISOString().slice(0, 10), answers: sorted }, null, 1)}\n`);

    console.log(report(`model (${version}, prompt ${promptHash})`, run, fx.recorded.model || null));
    console.log('\nmodel-answers.json written. Run `npm run intake:replay -- --update` to record the score.');
  }, 900000);
});
