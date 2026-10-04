import { describe, it, expect, beforeEach } from 'vitest';
import { storeFromClient } from './storeFromClient';

/**
 * GUARD: THE STORE BELONGS ON ITS OWN TICKET.
 *
 * The bug class: a wholesale repair that names nobody but the end customer, so the shop that sent it is
 * nowhere on the record. Invoicing, the store's own portal and every per-store report then disagree
 * about who the work belongs to — which is how a case study came to count five drop-offs where there
 * were three, and how The Smith's portal showed it 0 of its 162 repairs.
 *
 * Production, 2026-10-04: 198 of 292 wholesale repairs carried no `storeName`. After the backfill that
 * shipped with this, 291 of 292 are attributed. This function is what stops it recurring at intake.
 */

let rows;
const finds = [];

const fakeDb = {
  collection: () => ({
    findOne: async (filter, opts) => {
      finds.push({ filter, opts });
      if (rows === 'throw') throw new Error('mongo down');
      const ids = filter.$or.map((c) => c.clientID ?? c.userID);
      return rows.find((r) => ids.includes(r.clientID) || ids.includes(r.userID)) || null;
    },
  }),
};

beforeEach(() => {
  finds.length = 0;
  rows = [
    { clientID: 'client-35605079', userID: 'client-35605079', parentWholesalerId: 'user-c9f82772' },
    { clientID: 'client-noparent', userID: 'client-noparent' },
  ];
});

describe('finding the store behind a ticket', () => {
  it('returns the store a client belongs to', async () => {
    expect(await storeFromClient(fakeDb, 'client-35605079')).toBe('user-c9f82772');
  });

  it('matches on either clientID or userID — records carry both', async () => {
    const { filter } = finds.length ? finds[0] : { filter: null };
    await storeFromClient(fakeDb, 'client-35605079');
    expect(finds.at(-1).filter.$or).toEqual([
      { clientID: 'client-35605079' },
      { userID: 'client-35605079' },
    ]);
    expect(filter).toBeNull();
  });

  it('returns nothing for a client with no parent — never a guess', async () => {
    expect(await storeFromClient(fakeDb, 'client-noparent')).toBe('');
  });

  it('returns nothing for an unknown id', async () => {
    expect(await storeFromClient(fakeDb, 'user-c9f82772')).toBe('');
  });

  it.each([[''], [null], [undefined], ['   ']])('does not even query for %p', async (value) => {
    expect(await storeFromClient(fakeDb, value)).toBe('');
    expect(finds).toHaveLength(0);
  });

  it('never throws — attribution must not be able to refuse an intake', async () => {
    // A repair that cannot be saved is worse than a repair missing a store name. The caller falls
    // through to whatever it already knew.
    rows = 'throw';
    await expect(storeFromClient(fakeDb, 'client-35605079')).resolves.toBe('');
  });
});
