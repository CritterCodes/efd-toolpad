import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * NewRepairFlow passes one `flow` object to each step section (`<NewRepairFlowWork {...flow} />`). A section that
 * destructures a name `flow` doesn't carry gets `undefined` — and steps 2–4 only render after you click through,
 * so neither the views crawl nor eslint would notice. Every name a section takes must be in `flow`.
 */
const dir = __dirname;
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');

function flowKeys() {
  const src = read('NewRepairFlow.js');
  const m = /const flow = \{([\s\S]*?)\};/.exec(src);
  if (!m) throw new Error('no `const flow = { … }` in NewRepairFlow.js');
  return new Set(m[1].split(',').map((s) => s.trim()).filter(Boolean));
}

function sectionProps(file) {
  const src = read(file);
  const m = /export function \w+\(\{([^}]*)\}\)/.exec(src);
  return m ? m[1].split(',').map((s) => s.trim()).filter(Boolean) : [];
}

const sections = fs.readdirSync(dir).filter((f) => /^NewRepairFlow[A-Z]\w+\.js$/.test(f) && f !== 'NewRepairFlowParts.js' && !f.includes('.test.'));

describe('NewRepairFlow step sections get everything they read', () => {
  it('finds the sections', () => {
    expect(sections.length).toBeGreaterThanOrEqual(7);
  });

  it.each(sections)('%s takes only names that `flow` carries', (file) => {
    const keys = flowKeys();
    const missing = sectionProps(file).filter((p) => !keys.has(p));
    expect(missing).toEqual([]);
  });

  it('each section is rendered with {...flow}', () => {
    const page = read('NewRepairFlow.js');
    for (const file of sections) {
      const name = file.replace(/\.js$/, '');
      expect(page).toContain(`<${name} {...flow} />`);
    }
  });
});
