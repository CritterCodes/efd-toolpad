import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * ONE ENGINE PRICES A REPAIR. Owner, 2026-09-30: "one engine, no fallbacks, no stored prices."
 *
 * There was a second one, in `src/schemas/repair.schema.js`, and it was wrong in three ways at once:
 * it summed tasks + materials + custom line items and called that a TOTAL — dropping the rush fee, the
 * delivery fee and the tax — it took an `isWholesale` argument it never read, so wholesale and retail
 * priced identically, and its own body named the result `subtotal` while `Repair` assigned it to
 * `totalCost`.
 *
 * It survived because it was unreachable: the only route that creates a repair runs
 * `priceRepairForSave` first, so the `data.totalCost ?? calculateTotalCost(...)` fallback never fired.
 * That is what made it dangerous rather than harmless — it was a loaded gun for whoever added the next
 * create path, who would have got a plausible wrong number with no error and nothing to grep for.
 * Removed 2026-10-14.
 *
 * This fails if one grows back. It reads source rather than exercising the routes, because the routes
 * need a session, a database and settings — and because the thing worth preventing is the SHAPE
 * (summing line prices into a repair total) wherever it appears, not one function's return value.
 */

const SRC = path.join(process.cwd(), 'src');

/** Where pricing legitimately lives. Everything else must ask it. */
const ENGINE = ['src/services/pricing/', 'src/services/customs/'].map((p) => p.replace(/\//g, path.sep));

function sources() {
  const out = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!/\.(js|jsx)$/.test(e.name) || /\.test\.|\.guard\./.test(e.name)) continue;
      if (ENGINE.some((prefix) => p.includes(prefix))) continue;
      out.push({ file: path.relative(process.cwd(), p).replace(/\\/g, '/'), src: fs.readFileSync(p, 'utf8') });
    }
  })(SRC);
  return out;
}

describe('a repair total comes from the engine', () => {
  it('the schema no longer exports a cost calculator', () => {
    const schema = fs.readFileSync(path.join(SRC, 'schemas', 'repair.schema.js'), 'utf8');
    expect(schema).not.toMatch(/export const calculateTotalCost/);
    // The warning is the point: a bare deletion invites a well-meaning re-add.
    expect(schema, 'the note explaining why it is gone must stay').toMatch(/THERE IS NO `calculateTotalCost` HERE/);
  });

  it('nothing outside the engine assigns a summed total onto a repair', () => {
    // The shape: `<something>.totalCost = <lines>.reduce(` — a line sum landing ON a record.
    //
    // A PROPERTY assignment, deliberately. A bare `const totalCost = rows.reduce(...)` is a local, and
    // summing a column is what a report does: `utils/processes/data.helpers.js` adds up each process's
    // own `pricing.totalCost` to show an average, which is arithmetic about prices, not pricing. An
    // earlier version of this test flagged it, and a guard that cries wolf gets suppressed.
    const offenders = [];
    for (const { file, src } of sources()) {
      for (const m of src.matchAll(/\.totalCost\s*=\s*([^;\n]*\breduce\s*\()/g)) {
        offenders.push(`${file}: .totalCost = ${m[1].slice(0, 60)}…`);
      }
    }
    expect(
      offenders,
      'A repair total is being summed outside services/pricing. Ask the engine instead — a hand-rolled '
      + 'sum drops the rush fee, the delivery fee and the tax, which is exactly how the last one was '
      + 'wrong:\n  ' + offenders.join('\n  '),
    ).toEqual([]);
  });

  it('the Repair class does not re-price on update', () => {
    const cls = fs.readFileSync(path.join(SRC, 'app', 'api', 'repairs', 'class.js'), 'utf8');
    const update = cls.slice(cls.indexOf('update(updateData)'));
    const body = update.slice(0, update.indexOf('\n    }'));
    expect(body, 'update() must not set totalCost — PUT /api/repairs/[repairID] re-prices through the engine')
      .not.toMatch(/this\.totalCost\s*=/);
  });
});
