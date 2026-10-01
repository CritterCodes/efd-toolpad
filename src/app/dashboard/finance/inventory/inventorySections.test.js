import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The inventory page passes one `inventory` object to each tab panel (`<InventoryItemsTab {...inventory} />`). A
 * panel that destructures a name `inventory` doesn't carry gets `undefined`, and three of the four tabs only render
 * after a click — neither the views crawl nor eslint would notice. Same for page state named like a browser global.
 */
const dir = __dirname;
const read = (f) => fs.readFileSync(path.join(dir, f), 'utf8');
const PAGE = 'FinanceInventoryClient.js';
const sections = ['InventoryItemsTab.js', 'InventoryReceivingTab.js', 'InventoryConsumptionTab.js', 'InventoryLowStockTab.js'];
const BROWSER_GLOBALS = ['history', 'location', 'name', 'status', 'event', 'open', 'close', 'print', 'top', 'parent', 'length', 'origin', 'self', 'screen', 'closed', 'find', 'stop', 'scroll', 'focus', 'blur'];

function spreadKeys() {
  const m = /const inventory = \{([\s\S]*?)\};/.exec(read(PAGE));
  if (!m) throw new Error(`no \`const inventory = { … }\` in ${PAGE}`);
  return new Set(m[1].split(',').map((s) => s.trim()).filter(Boolean));
}
const propsOf = (src) => /export function \w+\(\{([^}]*)\}\)/.exec(src)[1].split(',').map((s) => s.trim()).filter(Boolean);

describe('inventory tab panels get everything they read', () => {
  it.each(sections)('%s takes only names that `inventory` carries, and is rendered with it', (file) => {
    const src = read(file);
    const keys = spreadKeys();
    expect(propsOf(src).filter((p) => !keys.has(p))).toEqual([]);
    expect(read(PAGE)).toContain(`<${/export function (\w+)/.exec(src)[1]} {...inventory} />`);
  });

  it.each(sections)('%s receives every page state it reads that shares a name with a browser global', (file) => {
    const page = read(PAGE);
    const src = read(file);
    const props = new Set(propsOf(src));
    const declared = BROWSER_GLOBALS.filter((g) => new RegExp(`const \\[${g},|const ${g} =`).test(page));
    const readBare = declared.filter((g) => new RegExp(`(^|[^.\\w'"])${g}(\\.|\\?\\.|\\[)`, 'm').test(src));
    expect(readBare.filter((g) => !props.has(g))).toEqual([]);
  });
});
