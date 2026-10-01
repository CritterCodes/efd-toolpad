import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

/**
 * GUARD (EFD-DEFECTS C1, GUARDRAILS_PLAN Phase 1): a customer is keyed by their `userID`, never their Mongo `_id`.
 *
 * The intake's client picker read `option._id || option.id || option.userID`, which filed 75 retail repairs (41
 * customers) under the database id — their own account never found them (re-keyed 2026-09-30). The fix reads
 * `userID` first; this fails if any file goes back to picking `_id` ahead of `userID` for a user id.
 */
const SRC = path.resolve(__dirname, '../..');

function sourceFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.') || entry.name === 'graphify-out') continue;
      sourceFiles(full, out);
    } else if (/\.(m?js|jsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) out.push(full);
  }
  return out;
}

// A user/client id assigned from `x._id || x.id || x.userID` (or `x._id || x.userID`): the database id wins over the
// user id. Only assignments to an id are judged — a React `key={a._id || a.userID}` is not a customer key.
const ID_BEFORE_USERID = /\b(?:userID|userId|clientID|clientId)\s*[:=]\s*(?:\([^)]*\)\s*=>\s*)?([\w.?]+)\._id\s*\|\|\s*(?:\1\.id\s*\|\|\s*)?\1\.userID\b/;

describe('customer keys', () => {
  it('no file picks the Mongo _id ahead of userID', () => {
    const offenders = sourceFiles(SRC).flatMap((file) => fs.readFileSync(file, 'utf8').split('\n')
      .map((line, i) => (ID_BEFORE_USERID.test(line) ? `${path.relative(SRC, file)}:${i + 1}  ${line.trim()}` : null))
      .filter(Boolean));
    expect(offenders).toEqual([]);
  });

  it('the pattern is real — it catches the shape that caused C1', () => {
    expect(ID_BEFORE_USERID.test("const userID = newValue._id || newValue.id || newValue.userID || '';")).toBe(true);
    expect(ID_BEFORE_USERID.test('  const clientId = (option) => option._id || option.id || option.userID || option.clientID;')).toBe(true);
    expect(ID_BEFORE_USERID.test('userID: clientInfo.userID || clientInfo._id || clientInfo.id')).toBe(false);
    expect(ID_BEFORE_USERID.test('key={artisan._id || artisan.userID}')).toBe(false);
  });
});
