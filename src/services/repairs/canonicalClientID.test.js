import { describe, it, expect } from 'vitest';
import { canonicalClientID } from './canonicalClientID';

/** EFD-DEFECTS C1: a repair is keyed to the customer's userID, never their Mongo _id. */
const dbi = (user) => ({ collection: () => ({ findOne: async () => user }) });

describe('canonicalClientID', () => {
  it("turns a user's Mongo _id into their userID", async () => {
    expect(await canonicalClientID(dbi({ userID: 'user-ann' }), '64b7f0c2a1b2c3d4e5f60718')).toBe('user-ann');
  });
  it('leaves a userID, and an _id that is no user, alone', async () => {
    expect(await canonicalClientID(dbi({ userID: 'x' }), 'user-ann')).toBe('user-ann');
    expect(await canonicalClientID(dbi(null), '64b7f0c2a1b2c3d4e5f60718')).toBe('64b7f0c2a1b2c3d4e5f60718');
  });
});
