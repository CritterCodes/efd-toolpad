import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * Committed regression coverage for the ship-to IDENTITY path — the bug class behind the real
 * incident (a drop-ship that landed on EFD instead of the artisan).
 *
 * Two failure modes are locked down here:
 *  - FAIL-OPEN: when the run creator and the design artisan differ as strings and one of them does
 *    NOT resolve to a known user, an earlier version shipped to whichever side survived. It must REFUSE.
 *  - FALSE REFUSAL: the same human recorded in two shapes (userID vs email) must NOT be a conflict.
 *
 * `users` and the runs model are mocked, so this runs without a live DB.
 */

const USERS = [
  { userID: 'u-999', email: 'nine@x.com' },
  { userID: 'u-111', email: 'one@x.com' },
];

vi.mock('@/lib/database', () => ({
  db: {
    connect: async () => ({
      collection: () => ({
        // Mimics REAL Mongo, including the dangerous part: an operator object like `{$ne:null}`
        // MATCHES an arbitrary user. (A throwing mock would be useless here — the service catches
        // errors and returns null, so the assertion would pass with or without the guard. Matching
        // like Mongo is what makes the typeof guard load-bearing in this test.)
        findOne: async (query) => {
          for (const clause of query.$or || []) {
            for (const [field, v] of Object.entries(clause)) {
              if (typeof v === 'string') {
                const hit = USERS.find((u) => u[field] === v);
                if (hit) return hit;
              } else if (v && typeof v === 'object' && '$ne' in v) {
                return USERS[0];        // real Mongo behavior: an operator matches the first doc
              } else if (Array.isArray(v)) {
                const hit = USERS.find((u) => v.includes(u[field]));
                if (hit) return hit;
              }
            }
          }
          return null;
        },
      }),
    }),
  },
}));

vi.mock('@/app/api/runs/model', () => ({
  default: { findById: async (runId) => (runId === 'r-known' ? { runId, createdBy: 'u-999' } : null) },
}));

const load = async () => (await import('@/services/production/castingVendorOrder'));

describe('drop-ship identity resolution (regression — must never fail open)', () => {
  beforeEach(() => vi.resetModules());

  it('the SAME person in two shapes (userID run creator + email design artisan) is NOT a conflict', async () => {
    const { resolveDropShipRecipient } = await load();
    const { recipient } = await resolveDropShipRecipient(
      { runId: 'r-known' },                    // run creator → u-999
      [{ pieceID: 'p1' }],
      { primaryArtisanId: 'nine@x.com' },      // same human, email shape
    );
    expect(recipient).toBe('u-999');           // canonical userID
  });

  it('REFUSES when one differing strong source does not resolve (the fail-open bug)', async () => {
    const { resolveDropShipRecipient } = await load();
    await expect(resolveDropShipRecipient(
      { runId: 'r-known' },                    // resolves → u-999
      [{ pieceID: 'p1' }],
      { primaryArtisanId: 'ghost-artisan' },   // does NOT resolve
    )).rejects.toThrow(/does not resolve to a known user/);
  });

  it('REFUSES two genuinely different people', async () => {
    const { resolveDropShipRecipient } = await load();
    await expect(resolveDropShipRecipient(
      { runId: 'r-known' },                    // u-999
      [{ pieceID: 'p1' }],
      { primaryArtisanId: 'one@x.com' },       // u-111 — a different human
    )).rejects.toThrow(/different people/);
  });

  it('REFUSES an unresolvable run reference rather than downgrading to a weak source', async () => {
    const { resolveDropShipRecipient } = await load();
    await expect(resolveDropShipRecipient(
      { runId: 'r-missing', ownerId: 'u-111' },
      [{ pieceID: 'p1' }],
      { primaryArtisanId: 'u-111' },
    )).rejects.toThrow(/no longer exists/);
  });

  it('canonicalUserID resolves either shape and returns null for the unknown', async () => {
    const { canonicalUserID } = await load();
    expect(await canonicalUserID('u-999')).toBe('u-999');
    expect(await canonicalUserID('nine@x.com')).toBe('u-999');
    expect(await canonicalUserID('ghost')).toBeNull();
    expect(await canonicalUserID(null)).toBeNull();
  });

  it('never lets a non-string reach the query (NoSQL-injection guard on the ship-to decision)', async () => {
    const { canonicalUserID } = await load();
    // The mock MATCHES an operator object the way real Mongo does, so if the typeof guard were
    // removed these would resolve to a real userID — which is exactly the misship vector.
    expect(await canonicalUserID({ $ne: null })).toBeNull();
    expect(await canonicalUserID(['u-999'])).toBeNull();
    expect(await canonicalUserID({ toString: () => 'u-999' })).toBeNull();
  });

  it('resolveArtisanShipTo REFUSES an operator object instead of addressing a stranger', async () => {
    const { resolveArtisanShipTo } = await load();
    await expect(resolveArtisanShipTo({ $ne: null })).rejects.toThrow(/not a valid identifier/);
  });

  it('an operator object as the design artisan is not even a candidate recipient', async () => {
    const { resolveDropShipRecipient } = await load();
    await expect(resolveDropShipRecipient({}, [{ pieceID: 'p1' }], { primaryArtisanId: { $ne: null } }))
      .rejects.toThrow(/cannot independently establish/);
  });

  it('resolveArtisanShipTo finds the artisan by EMAIL as well as userID', async () => {
    const { resolveArtisanShipTo } = await load();
    // Both users lack an artisanApplication, so it must fail on the ADDRESS (proving the user was
    // found), not on "artisan not found".
    await expect(resolveArtisanShipTo('nine@x.com')).rejects.toThrow(/shipping address is incomplete/);
    await expect(resolveArtisanShipTo('u-999')).rejects.toThrow(/shipping address is incomplete/);
    await expect(resolveArtisanShipTo('ghost')).rejects.toThrow(/not found/);
  });
});
