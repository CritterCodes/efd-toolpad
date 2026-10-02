import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ensureRepairsCanBatch } from '@/app/api/repair-invoices/service';

/**
 * GUARD (friction log F40). A screen must not promise a rule the server stopped enforcing.
 *
 * Owner hot fix, 2026-07-31: "i no longer want to require completed photos before invoicing." The gate came
 * out of all three places that held it — `ensureRepairsCanBatch`, `isReadyForInvoice`, and the closeout
 * route's auto-invoice trigger. The Closeout tab went on telling staff "After photo is mandatory" for
 * months afterwards, which is worse than a missing instruction: someone chasing a photo they do not need
 * is holding finished work out of a customer's hands.
 *
 * So this is two assertions that have to agree. If the requirement ever comes back, the first fails and the
 * copy is allowed again; while it is gone, the second keeps the screen honest.
 */
const PICKUP = path.resolve(__dirname);

const repair = (over = {}) => ({
  repairID: 'R-guard',
  status: 'COMPLETED',
  userID: 'user-1',
  clientName: 'Test Client',
  afterPhotos: [],
  ...over,
});

/**
 * Lines that actually render. A block comment runs across lines, so this tracks the open and the close
 * rather than testing each line on its own: a line-at-a-time filter reads a comment's middle lines as
 * code, which is how the first version of this guard flagged its own explanatory comment.
 */
function codeLines(text) {
  const out = [];
  let inBlock = false;
  for (const line of text.split('\n')) {
    let rest = line;
    let kept = '';
    while (rest) {
      if (inBlock) {
        const close = rest.indexOf('*/');
        if (close === -1) { rest = ''; break; }
        rest = rest.slice(close + 2);
        inBlock = false;
      } else {
        const open = rest.indexOf('/*');
        const lineComment = rest.indexOf('//');
        if (lineComment !== -1 && (open === -1 || lineComment < open)) {
          kept += rest.slice(0, lineComment);
          rest = '';
        } else if (open !== -1) {
          kept += rest.slice(0, open);
          rest = rest.slice(open + 2);
          inBlock = true;
        } else {
          kept += rest;
          rest = '';
        }
      }
    }
    out.push(kept);
  }
  return out;
}

/** Rendered copy that calls a photo compulsory. */
function photoCalledMandatory(text) {
  return codeLines(text)
    .filter((line) => /photo/i.test(line) && /\b(mandatory|is required|are required)\b/i.test(line))
    .map((line) => line.trim());
}

function pickupSources() {
  return fs.readdirSync(PICKUP, { withFileTypes: true })
    .filter((e) => e.isFile() && /\.(m?js|jsx)$/.test(e.name) && !/\.test\./.test(e.name))
    .map((e) => ({ name: e.name, text: fs.readFileSync(path.join(PICKUP, e.name), 'utf8') }));
}

describe('the after photo', () => {
  it('is still not required to batch a repair', async () => {
    await expect(ensureRepairsCanBatch([repair()])).resolves.toBeTruthy();
  });

  it('is not described to staff as mandatory anywhere on the Closeout screen', () => {
    const offenders = pickupSources().flatMap(({ name, text }) =>
      photoCalledMandatory(text).map((line) => `${name}: ${line}`));

    expect(offenders).toEqual([]);
  });

  it('would be caught if the copy came back — and a comment about it would not', () => {
    // The guard has to be able to fail, or it is decoration. This is the exact line that was on screen.
    expect(photoCalledMandatory('<Alert>Use the repair editor. After photo is mandatory.</Alert>'))
      .toEqual(['<Alert>Use the repair editor. After photo is mandatory.</Alert>']);
    expect(photoCalledMandatory('// the after photo is required\n/* After photo is mandatory\n   was the old copy */'))
      .toEqual([]);
  });
});
