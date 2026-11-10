#!/usr/bin/env node
/**
 * npm run intake:replay              rules mode: today's rulings over the stored model answers. Calls nothing.
 * npm run intake:replay -- --model   model mode first: today's prompt → Gemini → model-answers.json, then rules mode.
 * npm run intake:replay -- --update  record the score in test/fixtures/smart-intake/score.json.
 *
 * docs/goals/SMART_INTAKE.md, "The score".
 */
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const run = (files, env) => spawnSync('npx', ['vitest', 'run', ...files], {
  stdio: 'inherit', shell: true, env: { ...process.env, ...env },
}).status ?? 1;

if (args.includes('--model')) {
  const status = run(['test/smart-intake/replay.model.test.js'], { INTAKE_MODEL: '1' });
  if (status !== 0) process.exit(status);
}
process.exit(run(['test/smart-intake/replay.test.js', 'test/smart-intake/catalog.test.js'], args.includes('--update') ? { INTAKE_UPDATE: '1' } : {}));
