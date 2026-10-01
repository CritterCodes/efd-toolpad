import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The payroll page passes one `payroll` object to each section (`<PayrollDialog {...payroll} />`). A section that
 * destructures a name `payroll` doesn't carry gets `undefined` — the dialog only renders once a batch is open, so
 * neither the views crawl nor eslint would notice. Every name a section takes must be in `payroll`.
 */
const dir = __dirname;
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');

function spreadKeys() {
  const m = /const payroll = \{([\s\S]*?)\};/.exec(read('page.js'));
  if (!m) throw new Error('no `const payroll = { … }` in page.js');
  return new Set(m[1].split(',').map((s) => s.trim()).filter(Boolean));
}

const sections = ['PayrollDialog.js', 'PayrollLists.js', 'PayrollStats.js', 'PayrollDiagnostics.js'];

describe('payroll sections get everything they read', () => {
  it.each(sections)('%s takes only names that `payroll` carries, and is rendered with it', (file) => {
    const m = /export function (\w+)\(\{([^}]*)\}\)/.exec(read(file));
    expect(m).toBeTruthy();
    const keys = spreadKeys();
    expect(m[2].split(',').map((s) => s.trim()).filter(Boolean).filter((p) => !keys.has(p))).toEqual([]);
    expect(read('page.js')).toContain(`<${m[1]} {...payroll} />`);
  });
});
