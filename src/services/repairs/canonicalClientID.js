/**
 * A repair is keyed to its customer's `userID` — never their Mongo `_id` (EFD-DEFECTS C1).
 *
 * The intake's client picker read `_id` before `userID`, so 75 retail repairs (41 customers) were filed
 * under the database id: the customer's own account, the shop's "my repairs" and the account totals never
 * found them (re-keyed 2026-09-30, scripts/rekey-mongo-id-clients.mjs). The picker is fixed; this guards
 * the sink so no screen can do it again: a 24-hex id that is a user's `_id` becomes that user's `userID`.
 */
import { ObjectId } from 'mongodb';

const HEX = /^[a-f0-9]{24}$/;

export async function canonicalClientID(dbi, id) {
  const value = String(id || '').trim();
  if (!HEX.test(value)) return id;
  const user = await dbi.collection('users').findOne({ _id: new ObjectId(value) }, { projection: { userID: 1 } });
  return user?.userID || id;
}
