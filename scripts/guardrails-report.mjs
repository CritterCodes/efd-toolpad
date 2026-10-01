// `npm run guardrails:report` — what's left on the lint baseline, per rule (docs/GUARDRAILS_PLAN.md, Scoreboard).
//
// eslint-suppressions.json holds every violation that existed when a rule was switched on. CI fails on new ones and
// on fixed-but-unpruned ones, so this number only goes down. `--markdown` prints the scoreboard table rows.
import { readFileSync } from 'node:fs';

const START = { // counts when Phase 1 switched the rules on (2026-09-30)
  'no-console': 368,
  'no-unused-vars': 208,
  'max-lines': 42,
};
const TARGET = {
  'no-console': '2026-10-31',
  'no-unused-vars': '2026-10-24',
  'max-lines': '2027-01-31',
};

const suppressions = JSON.parse(readFileSync(new URL('../eslint-suppressions.json', import.meta.url), 'utf8'));
const byRule = {};
for (const rules of Object.values(suppressions)) {
  for (const [rule, { count }] of Object.entries(rules)) byRule[rule] = (byRule[rule] || 0) + count;
}
const files = (rule) => Object.values(suppressions).filter((r) => r[rule]).length;
const rules = [...new Set([...Object.keys(START), ...Object.keys(byRule)])];

if (process.argv.includes('--markdown')) {
  for (const rule of rules) {
    console.log(`| \`${rule}\` | ${START[rule] ?? '—'} | ${byRule[rule] || 0} (${files(rule)} files) | ${TARGET[rule] || 'set when added'} |`);
  }
} else {
  const total = Object.values(byRule).reduce((a, b) => a + b, 0);
  console.log(`Lint baseline: ${total} violation(s) left`);
  for (const rule of rules) console.log(`  ${rule.padEnd(24)} ${String(byRule[rule] || 0).padStart(5)}  in ${files(rule)} files   (start ${START[rule] ?? '—'}, target ${TARGET[rule] || '—'})`);
}
