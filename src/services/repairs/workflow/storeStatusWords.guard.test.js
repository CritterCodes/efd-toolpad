import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { REPAIR_STATUS, STORE_STATUS_LABELS, storeStatusLabel } from './statuses';

/**
 * GUARD: F52 — a store never reads our shop-floor vocabulary.
 *
 * A store's own repair list rendered the raw enum as the chip: `RECEIVING`, `NEEDS QUOTE`, `QC`,
 * `DELIVERY BATCHED`, `PAID_CLOSED`. The plain sentence for each existed, in `STATUS_DESCRIPTIONS` — but
 * only as a `title` tooltip, which **does not exist on a touch screen**. So the explanation was unreachable
 * on the device a jeweller is most likely holding, and what they saw instead was our internal state
 * machine in capitals.
 *
 * Two halves, and both can rot separately: every status needs a store word, and no store-facing screen may
 * print a raw one. The second is a source check, because the thing being asserted is that a particular
 * *mistake* is absent — a screen rendering `repair.status` straight into a label — and that is visible in
 * the source whether or not a test happens to render that screen with that status.
 */
const APP = path.resolve(__dirname, '../../../app');

/** The screens a store sees. Add to this list when a store gets another one. */
const STORE_FACING = [
  'dashboard/wholesaler/repairs/current/page.js',
  'dashboard/wholesaler/repairs/completed/page.js',
  'dashboard/wholesaler/repairs/schedule-pickup/page.js',
  'dashboard/repairs/my-repairs/page.js',
];

const read = (rel) => fs.readFileSync(path.join(APP, rel), 'utf8');

describe('what a store is shown', () => {
  it('has a word for every status', () => {
    const missing = Object.values(REPAIR_STATUS).filter((status) => !STORE_STATUS_LABELS[status]);
    expect(missing, `statuses with no store wording:\n  ${missing.join('\n  ')}`).toHaveLength(0);
  });

  it('never shows the raw status, which is what the defect was', () => {
    for (const status of Object.values(REPAIR_STATUS)) {
      expect(storeStatusLabel(status), `${status} is still itself`).not.toBe(status);
    }
  });

  it('never shows SCREAMING CAPITALS or an underscore', () => {
    for (const [status, label] of Object.entries(STORE_STATUS_LABELS)) {
      expect(label, `${status} -> ${label}`).not.toMatch(/_/);
      expect(label, `${status} -> ${label}`).not.toBe(label.toUpperCase());
    }
  });

  it('falls back to the raw status rather than to nothing', () => {
    // A blank chip in front of a customer is worse than our jargon. An unknown status is a bug the first
    // case catches; it must not also be an empty box on the screen.
    expect(storeStatusLabel('SOMETHING NEW')).toBe('SOMETHING NEW');
    expect(storeStatusLabel(undefined)).toBe('');
  });

  it('is what every store-facing screen actually renders', () => {
    for (const rel of STORE_FACING) {
      const source = read(rel);
      expect(source, `${rel} uses the store wording`).toMatch(/storeStatusLabel\(/);
      // The shape of the bug: a status going straight into a chip's label.
      expect(source, `${rel} still labels a chip with a raw status`).not.toMatch(
        /label=\{(?:repair\.status|displayStatus|repair\.normalizedStatus \|\| repair\.status)\}/,
      );
    }
  });

  it('leaves the internal vocabulary alone', () => {
    // The bench, the move page and every query still speak the real statuses. This only changes what a
    // store reads, so the enum itself must be untouched.
    expect(REPAIR_STATUS.QC).toBe('QC');
    expect(REPAIR_STATUS.NEEDS_QUOTE).toBe('NEEDS QUOTE');
    expect(REPAIR_STATUS.DELIVERY_BATCHED).toBe('DELIVERY BATCHED');
  });
});
