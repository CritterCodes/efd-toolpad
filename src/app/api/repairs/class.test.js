import { describe, expect, it } from 'vitest';
import Repair from './class';

/**
 * The Repair constructor is a field WHITELIST: whatever the POST route stamps that isn't copied
 * here never reaches Mongo. Request Quote shipped (PR #98) and silently never persisted for
 * exactly that reason — these tests pin the server-stamped blocks to the insert path.
 */
describe('Repair class keeps server-stamped blocks on insert', () => {
  const base = {
    clientName: 'Sam Johnson', userID: 'user-1', description: 'Rebuild bezel', isWholesale: true,
    tasks: [], materials: [], customLineItems: [], promiseDate: '2026-09-24',
  };

  it('carries quoteRequest and billing through the constructor and toObject()', () => {
    const quoteRequest = { status: 'requested', requestedAt: new Date('2026-09-21T20:00:00Z'), requestedBy: 'ws-1', requestedByName: 'Sam', quotedAt: null, quotedTotal: null, notifiedAt: null };
    const billing = { mode: 'wholesale' };
    const repair = new Repair({ ...base, quoteRequest, billing });
    expect(repair.quoteRequest).toEqual(quoteRequest);
    expect(repair.billing).toEqual(billing);
    const obj = repair.toObject();
    expect(obj.quoteRequest).toEqual(quoteRequest);
    expect(obj.billing).toEqual(billing);
  });

  it('omits the keys entirely when nothing was stamped (no `quoteRequest: null` noise on every repair)', () => {
    const obj = new Repair(base).toObject();
    expect('quoteRequest' in obj).toBe(false);
    expect('billing' in obj).toBe(false);
  });

  /**
   * The same whitelist silently dropped the STORE. The POST route resolves storeId/storeName from the
   * store's own record, but neither was copied here — so an admin-taken wholesale ticket persisted
   * with no store on it, and the print page's "another for the same store" shortcut had nothing to
   * carry. It looked like a missing feature; it was a dropped field.
   */
  it('keeps the store a wholesale ticket belongs to', () => {
    const repair = new Repair({ ...base, storeId: 'ws-marlen', storeName: 'Marlen Jewelers', businessName: 'Marlen Jewelers' });
    expect(repair.storeId).toBe('ws-marlen');
    expect(repair.storeName).toBe('Marlen Jewelers');
    expect(repair.toObject()).toMatchObject({ storeId: 'ws-marlen', storeName: 'Marlen Jewelers' });
  });

  it('keeps "no client given" — and never infers it', () => {
    const flagged = new Repair({ ...base, clientNotProvided: true });
    expect(flagged.clientNotProvided).toBe(true);
    expect(flagged.toObject().clientNotProvided).toBe(true);

    // A named client is not "no client given", and nothing but an explicit true sets it.
    expect(new Repair(base).clientNotProvided).toBe(false);
    expect(new Repair({ ...base, clientNotProvided: 'yes' }).clientNotProvided).toBe(false);
  });
});
