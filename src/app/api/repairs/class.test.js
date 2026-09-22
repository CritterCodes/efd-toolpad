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
});
