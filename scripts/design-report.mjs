#!/usr/bin/env node
/**
 * Design report — REPORT ONLY (owner, 2026-10-01: "report-only in CI").
 *
 * Runs Impeccable's deterministic detector (the vendored skill's launcher, .claude/skills/impeccable) over src/ and
 * summarizes what it finds against DESIGN.md: colors, font sizes and radii outside the documented tokens, plus its
 * generic anti-patterns (side-stripe borders, layout transitions, overused fonts). Waivers live in
 * .impeccable/config.json, each with a reason.
 *
 * It never fails a build: findings are a burn-down list, like Lighthouse, not a gate. It exits 0 even when the
 * detector cannot run (the reason is printed instead), so a missing engine download can never block a merge.
 *
 *   npm run design:report            # summary on stdout
 *   npm run design:report -- --out design-report   # also writes findings.json + summary.md there
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const LAUNCHER = path.join(ROOT, '.claude', 'skills', 'impeccable', 'scripts', 'impeccable');
const outIdx = process.argv.indexOf('--out');
const OUT = outIdx > -1 ? path.resolve(process.argv[outIdx + 1]) : null;

function summarize(findings) {
  const byRule = new Map();
  const byFile = new Map();
  for (const f of findings) {
    byRule.set(f.antipattern, (byRule.get(f.antipattern) || 0) + 1);
    const rel = path.relative(ROOT, f.file).split(path.sep).join('/');
    byFile.set(rel, (byFile.get(rel) || 0) + 1);
  }
  const sorted = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]);
  const lines = [
    '## Design report (Impeccable, report-only)',
    '',
    `**${findings.length} findings** against DESIGN.md. Never fails the build.`,
    '',
    '| Rule | Count |',
    '| --- | ---: |',
    ...sorted(byRule).map(([rule, n]) => `| \`${rule}\` | ${n} |`),
    '',
    '**Most findings, by file**',
    '',
    '| File | Count |',
    '| --- | ---: |',
    ...sorted(byFile).slice(0, 15).map(([file, n]) => `| \`${file}\` | ${n} |`),
    '',
  ];
  return lines.join('\n');
}

function main() {
  const run = spawnSync('sh', [LAUNCHER, 'detect', '--json', 'src'], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  // Exit 0 = clean, 2 = findings; anything else means the scan didn't run.
  if (run.error || ![0, 2].includes(run.status)) {
    console.log(`design report: detector did not run (${run.error?.message || `exit ${run.status}`}).`);
    if (run.stderr) console.log(run.stderr.trim().split('\n').slice(-5).join('\n'));
    return;
  }
  let findings = [];
  try {
    findings = run.stdout.trim() ? JSON.parse(run.stdout) : [];
  } catch (err) {
    console.log(`design report: could not read the detector's output (${err.message}).`);
    return;
  }
  const summary = summarize(findings);
  console.log(summary);
  if (OUT) {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, 'findings.json'), JSON.stringify(findings, null, 2));
    fs.writeFileSync(path.join(OUT, 'summary.md'), summary);
  }
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}

main();
