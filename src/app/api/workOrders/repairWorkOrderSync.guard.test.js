import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GUARD (hotfix 2026-10-01, widened the same day for EFD-DEFECTS B1): a repair written directly must re-sync its
 * work order.
 *
 * My Bench lists WORK ORDERS, not repairs. RepairsModel.updateById syncs the work order itself; a direct write to
 * the `repairs` collection does not. Store check-in did that (every checked-in job on no bench; repair-38a48db9
 * invisible for three months), and so did the scan's bulk move (a scanned Needs parts / Communications / Ready for
 * work never reached the bench card). Every file that WRITES `repairs` directly must call
 * WorkOrdersModel.syncFromRepairIDs / syncFromRepair (or, for a delete, remove the work order), unless it's listed
 * below with the reason its writes can't move a job on or off a bench.
 *
 * "Writes repairs" covers every way the code reaches the collection: `collection('repairs').<write>(…)` and a
 * variable bound to `db.dbRepairs()` or `collection('repairs')` then `<var>.<write>(…)`.
 */
const SRC = path.resolve(__dirname, '../../..');

const EXEMPT = {
  // The model's own writes: updateById syncs; the rest flip closeoutStatus (invoicing) or photos, not bench state;
  // deleteById removes the work order itself.
  'app/api/repairs/model.js': 'updateById syncs itself; other writes are closeout/photo only',
  // Marks a hand delivery delivered (outboundShipment.deliveredAt); status is untouched.
  'app/api/wholesale/shipping/route.js': 'deliveredAt only',
  // Edits the parts list only; the work order mirrors no part data.
  'app/api/repairs/parts/route.js': 'parts list only',
};

const WRITE = '(?:updateOne|updateMany|bulkWrite|findOneAndUpdate|replaceOne|deleteOne|deleteMany)';
const DIRECT = new RegExp(String.raw`collection\(\s*['"]repairs['"]\s*\)\s*\.\s*${WRITE}\s*\(`);
const BOUND = /(?:const|let|var)\s+(\w+)\s*=\s*(?:await\s+)?[\w.]*(?:dbRepairs\(\)|collection\(\s*['"]repairs['"]\s*\))\s*;/g;

/** Pure: does this source write the repairs collection? */
export function writesRepairs(text) {
  if (DIRECT.test(text)) return true;
  for (const m of text.matchAll(BOUND)) {
    if (new RegExp(String.raw`\b${m[1]}\s*\.\s*${WRITE}\s*\(`).test(text)) return true;
  }
  return false;
}

function sourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!entry.name.startsWith('.') && entry.name !== 'node_modules') sourceFiles(full, out); }
    else if (/\.(m?js|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
  }
  return out;
}

describe('repair writes keep the work order (and so My Bench) in step', () => {
  it('every direct write to repairs re-syncs work orders, or is exempt with a reason', () => {
    const offenders = sourceFiles(SRC)
      .map((file) => ({ rel: path.relative(SRC, file).split(path.sep).join('/'), text: fs.readFileSync(file, 'utf8') }))
      .filter(({ text }) => writesRepairs(text))
      .filter(({ rel, text }) => !EXEMPT[rel] && !/syncFromRepair(IDs)?\s*\(|RepairsModel\.(updateById|deleteById)\s*\(/.test(text))
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });

  it('sees every way of writing repairs — and not a file that only reads them', () => {
    expect(writesRepairs("await dbInstance.collection('repairs').updateMany(")).toBe(true);
    expect(writesRepairs('dbi.collection("repairs").deleteOne({ repairID })')).toBe(true);
    expect(writesRepairs('const dbRepairs = await db.dbRepairs();\nawait dbRepairs.bulkWrite(ops);')).toBe(true);
    expect(writesRepairs("const col = dbi.collection('repairs');\nawait col.findOneAndUpdate(q, u);")).toBe(true);
    expect(writesRepairs("const col = dbi.collection('repairs');\nconst r = await col.find(q).toArray();")).toBe(false);
    expect(writesRepairs("dbi.collection('repairInvoices').updateMany(")).toBe(false);
  });
});
