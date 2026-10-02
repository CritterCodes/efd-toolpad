import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GUARD: a transform cannot centre anything inside a MUI <Slide>.
 *
 * The bug class: a floating bar styled `position: fixed; left: 50%; transform: translateX(-50%)` and wrapped in
 * `<Slide>`. Slide sets its OWN transform to animate, which replaces the centring one — the computed style ends up a
 * pure vertical translate — so the bar sits exactly half its width to the right. On a wide screen it is still on
 * screen and nobody notices; at phone width it runs off the edge and its buttons cannot be reached.
 *
 * Found 2026-10-02 on all five bulk-selection bars at once (Catalog, Leads, Current, My Repairs, Receiving): the bar
 * measured 320px wide at left 157 on a 314px viewport, 160px past centre. The signed-in page crawl never caught it
 * because the bar only appears once something is selected.
 *
 * Centre a fixed element with `left: 0; right: 0; mx: 'auto'; width: 'fit-content'` instead — no transform, so there
 * is nothing for Slide to overwrite.
 */
const SRC = path.resolve(__dirname, '..');

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.jsx?$/.test(e.name) && !/\.test\.jsx?$/.test(e.name)) out.push(p);
  }
  return out;
}

describe('centring a fixed element', () => {
  it('no file centres with translateX(-50%) while using <Slide>', () => {
    const offenders = [];
    for (const file of walk(SRC)) {
      const code = fs.readFileSync(file, 'utf8');
      if (!code.includes('translateX(-50%)')) continue;
      if (!code.includes('<Slide')) continue;
      offenders.push(path.relative(SRC, file).split(path.sep).join('/'));
    }
    expect(offenders).toEqual([]);
  });

  it('every floating selection bar centres without a transform', () => {
    // The five pages that carry a bulk-selection bar. Each must keep the transform-free recipe.
    const BARS = [
      'app/dashboard/products/page.js',
      'app/dashboard/repairs/current/page.js',
      'app/dashboard/repairs/leads/page.js',
      'app/dashboard/repairs/my-repairs/page.js',
      'app/dashboard/repairs/receiving/page.js',
    ];
    for (const rel of BARS) {
      const code = fs.readFileSync(path.join(SRC, rel), 'utf8');
      expect(code.includes('<Slide'), `${rel} should still have its sliding bar`).toBe(true);
      expect(code.includes("mx: 'auto'"), `${rel} should centre with mx: 'auto'`).toBe(true);
      expect(code.includes("width: 'fit-content'"), `${rel} should size to its content`).toBe(true);
    }
  });
});
