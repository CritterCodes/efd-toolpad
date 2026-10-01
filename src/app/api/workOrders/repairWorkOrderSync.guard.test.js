import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GUARD (hotfix 2026-10-01): a repair written directly must re-sync its work order.
 *
 * My Bench lists WORK ORDERS, not repairs. RepairsModel.updateById syncs the work order itself; a direct
 * `collection('repairs').updateMany/updateOne` does not. Store check-in did exactly that, so every checked-in job
 * landed on no bench (Unclaimed included) until someone opened it — repair-38a48db9 stayed invisible for three
 * months. Every file that writes `repairs` directly must call WorkOrdersModel.syncFromRepairIDs (or
 * syncFromRepair), unless it's listed below with the reason its writes can't move a job on or off a bench.
 */
const SRC = path.resolve(__dirname, '../../..');

const EXEMPT = {
  // The model's own writes: updateById syncs; the other two only flip closeoutStatus (invoicing), not bench state.
  'app/api/repairs/model.js': 'closeoutStatus only; updateById syncs itself',
  // Marks a hand delivery delivered (outboundShipment.deliveredAt); status is untouched.
  'app/api/wholesale/shipping/route.js': 'deliveredAt only',
};

function sourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { if (!entry.name.startsWith('.') && entry.name !== 'node_modules') sourceFiles(full, out); }
    else if (/\.(m?js|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
  }
  return out;
}

const DIRECT_WRITE = /collection\(\s*['"]repairs['"]\s*\)\s*\.\s*update(One|Many)\s*\(/;

describe('repair writes keep the work order (and so My Bench) in step', () => {
  it('every direct write to repairs re-syncs work orders, or is exempt with a reason', () => {
    const offenders = sourceFiles(SRC)
      .map((file) => ({ rel: path.relative(SRC, file).split(path.sep).join('/'), text: fs.readFileSync(file, 'utf8') }))
      .filter(({ text }) => DIRECT_WRITE.test(text))
      .filter(({ rel, text }) => !EXEMPT[rel] && !/syncFromRepair(IDs)?\s*\(/.test(text))
      .map(({ rel }) => rel);
    expect(offenders).toEqual([]);
  });

  it('the pattern is real — it sees the write that caused the bug', () => {
    expect(DIRECT_WRITE.test("await dbInstance.collection('repairs').updateMany(")).toBe(true);
    expect(DIRECT_WRITE.test('dbi.collection("repairs").updateOne({ repairID })')).toBe(true);
    expect(DIRECT_WRITE.test("dbi.collection('repairInvoices').updateMany(")).toBe(false);
  });
});
