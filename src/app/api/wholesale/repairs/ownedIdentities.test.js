import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * GUARD: A STORE MUST SEE ITS OWN WORK, AND ONLY ITS OWN.
 *
 * The bug: `/api/wholesale/repairs` matched `{ userID: <the store> }` OR `{ createdBy: <the store> }`.
 * But a wholesale repair is often filed against one of the store's OWN CUSTOMERS — a `clients` record
 * with `parentWholesalerId: <the store>` — and the repair then carries that client's id. So the portal
 * hid the store's work from the store.
 *
 * In production, 2026-10-03, that was **220 repairs**: The Smith saw 0 of 162, Greers 1 of 20, Cooper's
 * 2 of 13, Rocky's 17 of 28. Which is the likely answer to why no store has ever used the portal — of
 * ~389 wholesale repairs only 22 were ever created by a store itself. They log in and it is empty.
 *
 * The other half of the guard is the boundary: clients are reachable ONLY through `parentWholesalerId`.
 * Widening this to "any client" would hand every store every other store's customers, which is a far
 * worse bug than the one being fixed.
 */

let clientRows = [];
const queries = [];

vi.mock('@/lib/database', () => ({
  db: {
    connect: vi.fn(async () => ({
      collection: (name) => ({
        find: (filter, opts) => {
          queries.push({ name, filter, opts });
          return { toArray: async () => (name === 'clients'
            ? clientRows.filter((c) => c.parentWholesalerId === filter.parentWholesalerId)
            : []) , project: () => ({ toArray: async () => [] }), sort: () => ({ toArray: async () => [] }) };
        },
      }),
    })),
  },
}));
vi.mock('@/lib/auth', () => ({ auth: vi.fn(async () => null) }));
vi.mock('@/services/repairWorkflow', () => ({
  normalizeRepairStatus: (s) => s,
  normalizeRepairWorkflow: (r) => r,
}));

const load = async () => import('./route.js');

beforeEach(() => {
  queries.length = 0;
  clientRows = [
    { clientID: 'client-35605079', userID: 'client-35605079', parentWholesalerId: 'user-c9f82772' },
    { clientID: 'client-aaa', userID: 'client-aaa', parentWholesalerId: 'user-c9f82772' },
    { clientID: 'client-other', userID: 'client-other', parentWholesalerId: 'user-SOMEONE-ELSE' },
  ];
  vi.clearAllMocks();
  vi.resetModules();
});

describe('which identities a store\'s repairs can be filed under', () => {
  it('includes the store itself and every client belonging to it', async () => {
    const { ownedIdentities } = await load();
    const db = await (await import('@/lib/database')).db.connect();
    const ids = await ownedIdentities(db, 'user-c9f82772');
    expect(ids).toContain('user-c9f82772');
    expect(ids).toContain('client-35605079');
    expect(ids).toContain('client-aaa');
  });

  it('NEVER includes another store\'s client', async () => {
    // The authorization boundary. Widening this hands every store everybody else's customers.
    const { ownedIdentities } = await load();
    const db = await (await import('@/lib/database')).db.connect();
    const ids = await ownedIdentities(db, 'user-c9f82772');
    expect(ids).not.toContain('client-other');
  });

  it('queries clients by parentWholesalerId and nothing looser', async () => {
    const { ownedIdentities } = await load();
    const db = await (await import('@/lib/database')).db.connect();
    await ownedIdentities(db, 'user-c9f82772');
    const q = queries.find((x) => x.name === 'clients');
    expect(q.filter).toEqual({ parentWholesalerId: 'user-c9f82772' });
  });

  it('returns just the store when it has no clients — no empty $in that matches nothing', async () => {
    clientRows = [];
    const { ownedIdentities } = await load();
    const db = await (await import('@/lib/database')).db.connect();
    expect(await ownedIdentities(db, 'user-bc65813d')).toEqual(['user-bc65813d']);
  });

  it('does not repeat an id when clientID and userID are the same value', async () => {
    const { ownedIdentities } = await load();
    const db = await (await import('@/lib/database')).db.connect();
    const ids = await ownedIdentities(db, 'user-c9f82772');
    expect(new Set(ids).size).toBe(ids.length);
  });
});
