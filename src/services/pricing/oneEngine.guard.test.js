import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * THE GUARD. Owner, 2026-09-30: "There should not be a single place in the app that does not use the same
 * thing. No exceptions." and "there should never be a fallback."
 *
 * Every price in the admin is calculated by services/pricing/engine.js. This test reads every source
 * file and fails when one:
 *   1. imports a pricing engine that was deleted (the old PricingEngine and its six modules), or
 *   2. invents a pricing setting when it's missing — `wage || 50`, `wholesaleMarkup || 1.5`,
 *      `taxRate || 0.0875`, `deliveryFee || 25`, `rushMultiplier || 1.5`, fees `|| 0.10` — the exact
 *      fallbacks that priced jobs from numbers the shop never set, or
 *   3. applies the volume tiers itself instead of through the engine.
 *
 * Comments are ignored (the engine's own header quotes the fallbacks it replaced). If this fails, the
 * fix is to call the engine — not to add the file to an allowlist.
 */
const SRC = path.resolve(__dirname, '../..');

function sourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      sourceFiles(full, out);
    } else if (/\.(m?js|jsx|ts|tsx)$/.test(entry.name) && !/\.test\.|\.probe\./.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

// Strip comments so quoted history in doc blocks doesn't trip the rules (good enough for this codebase:
// it doesn't put `//` inside string literals next to these patterns).
const stripComments = (code) => code
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');

const FILES = sourceFiles(SRC).map((file) => ({
  rel: path.relative(SRC, file).replace(/\\/g, '/'),
  code: stripComments(fs.readFileSync(file, 'utf8')),
}));

const offenders = (pattern, { except = [] } = {}) => FILES
  .filter((f) => !except.includes(f.rel))
  .flatMap((f) => f.code.split('\n').map((line, i) => (pattern.test(line) ? `${f.rel}:${i + 1}  ${line.trim()}` : null)))
  .filter(Boolean);

describe('one pricing engine, no fallbacks', () => {
  it('scans the source tree', () => {
    expect(FILES.length).toBeGreaterThan(500);
    expect(FILES.some((f) => f.rel === 'services/pricing/engine.js')).toBe(true);
  });

  it('nothing imports a deleted pricing engine', () => {
    expect(offenders(/services\/PricingEngine|pricing\/(task|process|material|labor|business|config)\.pricing/)).toEqual([]);
  });

  it('nothing invents a pricing setting when it is missing', () => {
    const fallback = (field, value) => new RegExp(`\\b${field}\\s*(\\|\\||\\?\\?)\\s*${value}`);
    const rules = [
      fallback('wage', '\\d'),
      fallback('wholesaleMarkup', '\\d'),
      fallback('materialMarkup', '\\d'),
      fallback('rushMultiplier', '\\d'),
      fallback('deliveryFee', '[1-9]'),
      fallback('taxRate', '0?\\.0\\d'),
      fallback('(administrativeFee|businessFee|consumablesFee)', '0?\\.\\d'),
    ];
    expect(rules.flatMap((rule) => offenders(rule))).toEqual([]);
  });

  it('only the engine applies the volume tiers', () => {
    expect(offenders(/\bapplyQuantityTier\s*\(/, { except: ['services/pricing/engine.js', 'services/pricing/quantityTiers.js'] })).toEqual([]);
  });
});
