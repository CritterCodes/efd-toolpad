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
import crypto from 'node:crypto';
import { describe, it } from 'vitest';
import { buildIntakePrompt } from '@/services/ai/smartIntakeRules';
import { FIXTURES, loadFixtures, lastAttemptPerTicket, expectedFor, scoreReplay, report } from './replay.js';

const MODEL = 'gemini-2.5-flash';
const RUN = process.env.INTAKE_MODEL === '1';

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
        generationConfig: { temperature: 0.1, topP: 0.9, maxOutputTokens: 8000, responseMimeType: 'application/json' },
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

describe.skipIf(!RUN)('smart intake replay (model mode)', () => {
  it('asks the model about every scored ticket and scores the answers', async () => {
    const key = apiKey();
    if (!key) throw new Error('No GEMINI_API_KEY. See docs/goals/SMART_INTAKE.md, "The score", for where to get it.');
    const fx = loadFixtures();
    const todo = lastAttemptPerTicket(fx.intakes).filter((i) => !expectedFor(i, fx.marks, fx.catalog).skip);
    const answers = {};
    let version = MODEL;
    const queue = [...todo];
    const worker = async () => {
      while (queue.length) {
        const intake = queue.shift();
        const prompt = buildIntakePrompt({ inputText: intake.text, description: intake.description, tasks: fx.catalog, todayIso: intake.at });
        const got = await ask(prompt, key);
        answers[intake.id] = got.answer;
        version = got.version;
      }
    };
    await Promise.all(Array.from({ length: 5 }, worker));

    const promptHash = crypto.createHash('sha256')
      .update(buildIntakePrompt({ inputText: '', description: '', tasks: fx.catalog, todayIso: '' })).digest('hex').slice(0, 12);
    const sorted = Object.fromEntries(Object.keys(answers).sort().map((id) => [id, answers[id]]));
    fs.writeFileSync(path.join(FIXTURES, 'model-answers.json'),
      `${JSON.stringify({ model: version, promptHash, at: new Date().toISOString().slice(0, 10), answers: sorted }, null, 1)}\n`);

    const run = scoreReplay(fx, (intake) => answers[intake.id]);
    console.log(report(`model (${version}, prompt ${promptHash})`, run, fx.recorded.model || null));
    console.log('\nmodel-answers.json written. Run `npm run intake:replay -- --update` to record the score.');
  }, 900000);
});
