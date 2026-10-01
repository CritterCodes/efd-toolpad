import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The Stuller page passes one `stuller` object to each extracted section (`<StullerInvoiceDialog {...stuller} />`).
 * A section that destructures a name `stuller` doesn't carry gets `undefined`; the invoice dialog only renders after
 * a click, so neither the views crawl nor eslint would notice. Same for page state named like a browser global.
 */
const dir = __dirname;
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
const sections = ['StullerInvoiceDialog.js', 'StullerInvoicesCard.js', 'StullerApiSettingsCard.js'];
const BROWSER_GLOBALS = ['history', 'location', 'name', 'status', 'event', 'open', 'close', 'print', 'top', 'parent', 'length', 'origin', 'self', 'screen', 'closed', 'find', 'stop', 'scroll', 'focus', 'blur'];

function spreadKeys() {
  const m = /const stuller = \{([\s\S]*?)\};/.exec(read('page.js'));
  if (!m) throw new Error('no `const stuller = { … }` in page.js');
  return new Set(m[1].split(',').map((s) => s.trim()).filter(Boolean));
}
const propsOf = (src) => /export function \w+\(\{([^}]*)\}\)/.exec(src)[1].split(',').map((s) => s.trim()).filter(Boolean);

describe('Stuller page sections get everything they read', () => {
  it.each(sections)('%s takes only names that `stuller` carries, and is rendered with it', (file) => {
    const src = read(file);
    expect(propsOf(src).filter((p) => !spreadKeys().has(p))).toEqual([]);
    expect(read('page.js')).toContain(`<${/export function (\w+)/.exec(src)[1]} {...stuller} />`);
  });

  it.each(sections)('%s receives every page state it reads that shares a name with a browser global', (file) => {
    const page = read('page.js');
    const src = read(file);
    const props = new Set(propsOf(src));
    const declared = BROWSER_GLOBALS.filter((g) => new RegExp(`const \\[${g},|const ${g} =`).test(page));
    const readBare = declared.filter((g) => new RegExp(`(^|[^.\\w'"])${g}(\\.|\\?\\.|\\[)`, 'm').test(src));
    expect(readBare.filter((g) => !props.has(g))).toEqual([]);
  });
});
