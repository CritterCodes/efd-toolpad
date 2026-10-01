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

  // Component state that shares a name with a browser global: inside a section a bare `history` / `name` / `status`
  // is the window's, so lint sees nothing to pass and it fails only at runtime (the payroll split did exactly this,
  // 2026-10-01). A section reading one must receive it.
  const BROWSER_GLOBALS = ['history', 'location', 'name', 'status', 'event', 'open', 'close', 'print', 'top', 'parent', 'length', 'origin', 'self', 'screen', 'closed', 'find', 'stop', 'scroll', 'focus', 'blur'];
  it.each(sections)('%s receives every component state it reads that shares a name with a browser global', (file) => {
    const page = read('NewRepairFlow.js');
    const src = read(file);
    const props = new Set(sectionProps(file));
    const declared = BROWSER_GLOBALS.filter((g) => new RegExp(`const \\[${g},|const ${g} =|[{,]\\s*${g}\\s*[,}]`).test(page));
    const readBare = declared.filter((g) => new RegExp(`(^|[^.\\w'"])${g}(\\.|\\?\\.|\\[)`, 'm').test(src));
    expect(readBare.filter((g) => !props.has(g))).toEqual([]);
  });
});
