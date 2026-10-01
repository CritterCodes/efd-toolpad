import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * The smart-intake log (OPEN-QUESTIONS Q13): an AI suggestion, then what the ticket became. The comparisons are what
 * Admin → Smart intake log counts as "where it went wrong", so they are tested field by field.
 */
const mocks = vi.hoisted(() => ({ insertOne: vi.fn(), updateMany: vi.fn(), connect: vi.fn() }));
vi.mock('@/lib/database', () => ({ db: { connect: mocks.connect } }));

const {
  surfaceOf, ticketOutcome, compareIntake, parseIntakeLogIDs, summarizeMisses, withChanges,
  recordIntakeSuggestion, recordIntakeOutcomes,
} = await import('./smartIntakeLog');

beforeEach(() => {
  vi.clearAllMocks();
  mocks.connect.mockResolvedValue({ collection: () => ({ insertOne: mocks.insertOne, updateMany: mocks.updateMany }) });
  mocks.updateMany.mockResolvedValue({ modifiedCount: 1 });
});

describe('surfaceOf', () => {
  it('is a store intake for a wholesaler and the counter for everyone else', () => {
    expect(surfaceOf({ user: { role: 'wholesaler' } })).toBe('store');
    expect(surfaceOf({ user: { role: 'admin' } })).toBe('counter');
    expect(surfaceOf(null)).toBe('counter');
  });
});

describe('ticketOutcome', () => {
  it("reads the ticket's own fields, normalizing case and task ids", () => {
    const out = ticketOutcome({
      description: ' Ring ', metalType: 'Gold', karat: '14K', goldColor: 'Yellow', isRing: 'true',
      currentRingSize: '7', desiredRingSize: '6', promiseDate: '2026-10-08T00:00:00.000Z',
      tasks: [{ _id: 't1', title: 'Size Down', quantity: 1 }, { taskId: 't2', displayName: 'Retip', quantity: '3' }, {}],
    });
    expect(out).toEqual({
      description: 'Ring', metalType: 'gold', karat: '14k', goldColor: 'yellow', isRing: true,
      currentRingSize: '7', desiredRingSize: '6', promiseDate: '2026-10-08',
      tasks: [{ id: 't1', title: 'Size Down', quantity: 1 }, { id: 't2', title: 'Retip', quantity: 3 }],
    });
  });
});

describe('compareIntake', () => {
  const suggestion = {
    metalType: 'gold', karat: '14k', goldColor: 'yellow', isRing: true, currentRingSize: '7', desiredRingSize: '6',
    promiseDate: '', tasks: [{ id: 't1', title: 'Size Down', quantity: 1 }],
  };

  it('reports nothing when the ticket kept what the AI said', () => {
    const outcome = ticketOutcome({ ...suggestion, metalType: 'Gold', isRing: true, tasks: [{ _id: 't1', quantity: 1 }] });
    expect(compareIntake('text', suggestion, outcome)).toEqual([]);
  });

  it('reports each field that was changed, and a blank the person had to fill in', () => {
    const outcome = ticketOutcome({ ...suggestion, karat: '18k', promiseDate: '2026-10-08', tasks: [{ _id: 't1', quantity: 2 }] });
    const changes = compareIntake('text', suggestion, outcome);
    expect(changes).toEqual([
      { field: 'karat', ai: '14k', final: '18k' },
      { field: 'promiseDate', ai: '—', final: '2026-10-08' },
      { field: 'tasks', ai: 'Size Down', final: 't1 ×2' },
    ]);
  });

  it('counts a wrong ring call', () => {
    const outcome = ticketOutcome({ ...suggestion, isRing: false });
    expect(compareIntake('text', suggestion, outcome).map((c) => c.field)).toEqual(['isRing']);
  });

  it('compares only the description for a photo, ignoring case', () => {
    expect(compareIntake('photo', { description: 'A gold ring.' }, { description: 'a GOLD ring.' })).toEqual([]);
    expect(compareIntake('photo', { description: 'A gold ring.' }, { description: 'A silver ring.' }))
      .toEqual([{ field: 'description', ai: 'A gold ring.', final: 'A silver ring.' }]);
  });
});

describe('parseIntakeLogIDs', () => {
  it('accepts an array or the JSON string a multipart save sends, and keeps only log ids', () => {
    expect(parseIntakeLogIDs(['sil-a1', 'x', ' sil-b2 '])).toEqual(['sil-a1', 'sil-b2']);
    expect(parseIntakeLogIDs('["sil-a1"]')).toEqual(['sil-a1']);
    expect(parseIntakeLogIDs('not json')).toEqual([]);
    expect(parseIntakeLogIDs({ $ne: null })).toEqual([]);
    expect(parseIntakeLogIDs(undefined)).toEqual([]);
  });

  it('caps the list', () => {
    expect(parseIntakeLogIDs(Array.from({ length: 50 }, (_, i) => `sil-${i}`))).toHaveLength(20);
  });
});

describe('summarizeMisses + withChanges', () => {
  const entries = [
    { kind: 'text', output: { karat: '14k', tasks: [] }, outcome: ticketOutcome({ karat: '18k' }) },
    { kind: 'text', output: { karat: '14k', tasks: [] }, outcome: ticketOutcome({ karat: '14k' }) },
    { kind: 'photo', output: { description: 'a' }, outcome: ticketOutcome({ description: 'b' }) },
    { kind: 'text', output: { karat: '14k' }, outcome: null },
  ];

  it('counts logged, saved, changed and misses per field', () => {
    expect(summarizeMisses(entries)).toEqual({ logged: 4, saved: 3, changed: 2, byField: { karat: 1, description: 1 } });
  });

  it("attaches each entry's changes, null when it was never saved, and drops the Mongo _id", () => {
    expect(withChanges({ _id: 'x', ...entries[0] })).not.toHaveProperty('_id');
    expect(withChanges(entries[0]).changes).toEqual([{ field: 'karat', ai: '14k', final: '18k' }]);
    expect(withChanges(entries[3]).changes).toBeNull();
  });
});

describe('recording', () => {
  it('stores who, where, the input and the output, and returns the log id', async () => {
    const id = await recordIntakeSuggestion({
      session: { user: { role: 'wholesaler', userID: 'ws-1', name: 'Marlen' } },
      kind: 'text', input: { text: '14k size down to 6' }, output: { karat: '14k' }, model: 'm', ms: 900,
    });
    expect(id).toMatch(/^sil-/);
    expect(mocks.insertOne.mock.calls[0][0]).toMatchObject({
      logID: id, kind: 'text', surface: 'store', userID: 'ws-1', userName: 'Marlen', input: { text: '14k size down to 6' },
      output: { karat: '14k' }, outcome: null, repairID: null,
    });
  });

  it('never throws: a log failure returns null and the intake carries on', async () => {
    mocks.connect.mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(recordIntakeSuggestion({ session: null, kind: 'photo', input: {}, output: {} })).resolves.toBeNull();
    await expect(recordIntakeOutcomes({ logIDs: ['sil-a'], body: {}, repairID: 'r' })).resolves.toBe(0);
  });

  it('writes the outcome only onto unsaved entries, and skips the DB when there are no ids', async () => {
    expect(await recordIntakeOutcomes({ logIDs: [], body: {} })).toBe(0);
    expect(mocks.connect).not.toHaveBeenCalled();
    await recordIntakeOutcomes({ logIDs: ['sil-a', 'bad'], body: { karat: '18K' }, repairID: 'r-1' });
    const [filter, update] = mocks.updateMany.mock.calls[0];
    expect(filter).toEqual({ logID: { $in: ['sil-a'] }, outcome: null });
    expect(update.$set).toMatchObject({ repairID: 'r-1', outcome: { karat: '18k' } });
  });
});
