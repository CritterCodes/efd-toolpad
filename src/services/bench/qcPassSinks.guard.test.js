import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GUARD (EFD-DEFECTS B6, and the lesson from the work-order sync hotfix): guard the sink, not the route.
 *
 * Passing QC credits labour and raises an invoice, and there are TWO places that do it — the bench action
 * and `api/repairs/[repairID]/complete-from-qc`, which the Move page and the scan's "Approve QC" post
 * straight to. Guarding one leaves the other open, and the open one was the easier door: scan your own
 * ticket, approve it, credited and invoiced.
 *
 * So: anything that writes the QC-pass update must first consult `qcPassRefusal`. This finds the writers by
 * what they do — call `buildCompleteFromQcUpdate` — rather than by a list someone has to remember to extend.
 */
const SRC = path.resolve(__dirname, '../..');

function sourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.') || entry.name === 'graphify-out') continue;
      sourceFiles(full, out);
    } else if (/\.(m?js|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// A sink CALLS the builder. Declaring it, re-exporting it through a barrel, or importing the name are
// all just the name appearing in a file — only a call writes a QC pass. The declaration is dropped
// first, because `function buildCompleteFromQcUpdate(` otherwise reads as a call to itself.
const DECLARATION = /(?:export\s+)?(?:async\s+)?function\s+buildCompleteFromQcUpdate\s*\(/g;
const CALLS_THE_BUILDER = /\bbuildCompleteFromQcUpdate\s*\(/;

function qcPassSinks() {
  return sourceFiles(SRC)
    .filter((file) => CALLS_THE_BUILDER.test(fs.readFileSync(file, 'utf8').replace(DECLARATION, '')))
    .map((file) => ({ rel: path.relative(SRC, file).replace(/\\/g, '/'), file }));
}

describe('every QC-pass sink', () => {
  it('checks qcPassRefusal before writing the pass', () => {
    const unguarded = qcPassSinks()
      .filter(({ file }) => !fs.readFileSync(file, 'utf8').includes('qcPassRefusal'))
      .map(({ rel }) => rel);

    expect(unguarded).toEqual([]);
  });

  it('finds the sinks it is meant to be watching', () => {
    // A scan that matched nothing would pass the assertion above while protecting nothing.
    const sinks = qcPassSinks().map(({ rel }) => rel);

    expect(sinks).toContain('services/bench/benchActions.js');
    expect(sinks).toContain('app/api/repairs/[repairID]/complete-from-qc/route.js');
  });
});
