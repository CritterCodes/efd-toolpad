// @vitest-environment jsdom
/**
 * Where the model's answer becomes ticket lines. Driven with the REAL server rulings (`decideIntake`) behind a stubbed
 * fetch, so the test sees what production's form sees. Every case is a bug a review demonstrated on 2026-11-09.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useRef, useState } from 'react';
import { renderHook, act } from '@testing-library/react';
import { decideIntake } from '@/services/ai/smartIntakeRules';
import { useSmartIntake, sizingStockItemsFor, explicitRingSizes, saysRing, EMPTY_INTAKE_NOTES, AI_DOWN_MESSAGE } from './useSmartIntake';
import { sizingStockCheck, ticketChecks } from './newRepairFormHelpers';

const task = (id, title, extra = {}) => ({ _id: id, title, ...extra });
const TASKS = [
  task('down', 'Size Down'),
  task('up3', 'Size up (1 size) - up to 3mm x 2 mm shank'),
  task('up5', 'Size Up  - 3mm to 5mm shanks'),
  task('rh', 'Rhodium Plating'),
  task('retip', 'Retip prongs'),
  task('weld', 'Laser Weld'),
];
const MATERIALS = [
  { _id: 'solder', name: '14k Yellow Gold Solder', category: 'solder' },
  { _id: 's32', name: '3x2 mm Flat Sizing Stock', category: 'sizing_material' },
  { _id: 's52', name: '5x2 mm Flat Sizing Stock', category: 'sizing_material' },
];
const BLANK = { smartIntakeInput: '', description: '', metalType: '', karat: '', goldColor: '', isRing: false, currentRingSize: '', desiredRingSize: '', promiseDate: '', tasks: [], materials: [] };

/** The hook inside a component that owns the form, as useNewRepairForm does. */
function harness(materials = MATERIALS) {
  return renderHook(() => {
    const [formData, setFormData] = useState(BLANK);
    const [notes, setNotes] = useState(EMPTY_INTAKE_NOTES);
    const [error, setError] = useState('');
    const logIds = useRef([]);
    const intake = useSmartIntake({
      availableMaterials: materials, availableTasks: TASKS, formData, setFormData,
      setAnalyzingSmartIntake: () => {}, setSmartIntakeError: setError, setSmartIntakeNotes: setNotes, smartIntakeLogIDsRef: logIds,
    });
    return { ...intake, formData, setFormData, notes, error };
  });
}

/** The model's raw answer for the next read; the route's rulings are applied for real. */
let nextAnswer = {};
let fail = false;
beforeEach(() => {
  fail = false;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  global.fetch = vi.fn(async (_url, init) => {
    if (fail) return { ok: false, status: 504, json: async () => { throw new Error('html'); } };
    const body = JSON.parse(init.body);
    const parsed = decideIntake(nextAnswer, { tasks: body.tasks, inputText: body.inputText, formMetal: body.metal });
    return { ok: true, status: 200, json: async () => ({ success: true, data: { parsed, intakeLogID: 'sil-test' } }) };
  });
});
afterEach(() => vi.restoreAllMocks());

const read = async (h, sentence, answer) => {
  nextAnswer = answer;
  act(() => h.result.current.setFormData((p) => ({ ...p, smartIntakeInput: sentence })));
  await act(async () => { await h.result.current.handleAnalyzeSmartIntake(); });
};
const lines = (h) => h.result.current.formData.tasks.map((t) => `${t._id}x${t.quantity}`).join(' ');
const stockQty = (h) => h.result.current.formData.materials.map((m) => `${m._id}x${m.quantity}`).join(' ');

describe('useSmartIntake', () => {
  it('white gold, 5 to 7: size up, sizing stock, rhodium — and the rule-added lines say so', async () => {
    const h = harness();
    await read(h, '14k white gold ring going up from 5 to a 7', { metalType: 'gold', karat: '14k', goldColor: 'white', isRing: true, currentRingSize: '5', desiredRingSize: '7' });
    expect(lines(h)).toBe('up3x1 rhx1');
    expect(stockQty(h)).toBe('s32x1');
    expect(h.result.current.formData.tasks.map((t) => t._smartIntakeRuled || '')).toEqual(['the ring changes size', 'white gold']);
    expect(h.result.current.notes.warnings.join(' ')).toMatch(/Added "Rhodium Plating": white gold/);
    expect(h.result.current.notes.assumed.goldColor).toBe('');
  });

  it('a re-read replaces what the last read put there, and keeps what was added by hand', async () => {
    const h = harness();
    await read(h, '14k yg ring 5 to 8', { metalType: 'gold', karat: '14k', goldColor: 'yellow', isRing: true, currentRingSize: '5', desiredRingSize: '8' });
    expect([lines(h), stockQty(h)]).toEqual(['up3x1', 's32x2']);
    // By hand: a laser weld.
    act(() => h.result.current.setFormData((p) => ({ ...p, tasks: [...p.tasks, { ...TASKS[5], id: 99, quantity: 1 }] })));
    // The corrected sentence: white gold, going DOWN, plus a retip.
    await read(h, '14k wg ring size down 8 to 6, retip 4 prongs', { metalType: 'gold', karat: '14k', goldColor: 'white', isRing: true, currentRingSize: '8', desiredRingSize: '6', matchedTasks: [{ id: 'retip', quantity: 4 }] });
    expect(lines(h)).toBe('weldx1 downx1 retipx4 rhx1');
    expect(stockQty(h)).toBe('');
    expect(h.result.current.formData).toMatchObject({ goldColor: 'white', currentRingSize: '8', desiredRingSize: '6' });
  });

  it('a re-read with no sizes clears the sizes the last read set', async () => {
    const h = harness();
    await read(h, 'ring 5 to 7', { isRing: true, currentRingSize: '5', desiredRingSize: '7' });
    await read(h, 'ring retip 2 prongs', { isRing: true, matchedTasks: [{ id: 'retip', quantity: 2 }] });
    expect(h.result.current.formData).toMatchObject({ currentRingSize: '', desiredRingSize: '' });
    expect([lines(h), stockQty(h)]).toEqual(['retipx2', '']);
  });

  it('a colour nobody said is marked assumed; one chosen on the form is used, and gets its rhodium', async () => {
    const h = harness();
    await read(h, '14k ring retip 4 prongs', { metalType: 'gold', karat: '14k', isRing: true, matchedTasks: [{ id: 'retip', quantity: 4 }] });
    expect(h.result.current.formData.goldColor).toBe('yellow');
    expect(h.result.current.notes.assumed.goldColor).toBe('yellow');

    const g = harness();
    act(() => g.result.current.setFormData((p) => ({ ...p, metalType: 'gold', karat: '14k', goldColor: 'white' })));
    await read(g, '14k ring retip 4 prongs', { metalType: 'gold', karat: '14k', isRing: true, matchedTasks: [{ id: 'retip', quantity: 4 }] });
    expect(lines(g)).toBe('retipx4 rhx1');
    expect(g.result.current.notes.assumed.goldColor).toBe('');
  });

  it('when the AI is down: the metal and the sizes, and nothing else — no tasks, no stock, no date', async () => {
    const h = harness();
    fail = true;
    await read(h, 'size up 14k wg ring 5 to 8, retip 14 prongs, set 1/2 ct diamond', {});
    expect(h.result.current.formData).toMatchObject({ metalType: 'gold', karat: '14k', goldColor: 'white', tasks: [], materials: [], promiseDate: '' });
    expect(h.result.current.notes.fallback).toBe(true);
    expect(h.result.current.error).toBe(AI_DOWN_MESSAGE);
  });

  it('the model matched nothing: nothing is guessed in its place', async () => {
    const h = harness();
    await read(h, 'sterling silver chain, polish and solder', { metalType: 'silver' });
    expect(lines(h)).toBe('');
  });

  it('only sizing stock is ever added as sizing stock', () => {
    const hints = [{ type: 'sizing_material', quantity: 2 }];
    expect(sizingStockItemsFor(hints, [MATERIALS[0]], {})).toEqual({ items: [], missing: true });
    expect(sizingStockItemsFor(hints, MATERIALS, {}).items.map((m) => m._id)).toEqual(['s32']);
    expect(sizingStockItemsFor(hints, MATERIALS, {}, { wide: true }).items.map((m) => m._id)).toEqual(['s52']);
    expect(sizingStockItemsFor([{ type: 'solder', quantity: 2 }], MATERIALS, {})).toEqual({ items: [], missing: false });
    expect(sizingStockItemsFor(hints, [], {}).missing).toBe(true);
  });

  it('says so when the job needs stock and the materials list has none', async () => {
    const h = harness([MATERIALS[0]]);
    await read(h, 'ring 5 to 8', { isRing: true, currentRingSize: '5', desiredRingSize: '8' });
    expect(stockQty(h)).toBe('');
    expect(h.result.current.notes.warnings.join(' ')).toMatch(/needs sizing stock, and the materials list has none/);
  });
});

describe('sizingStockCheck — the stock follows the sizes after the read', () => {
  const form = (over) => ({ currentRingSize: '5', desiredRingSize: '7', tasks: [{ ...TASKS[1], quantity: 1 }], materials: [{ ...MATERIALS[1], id: 1, quantity: 1 }], ...over });

  it('nothing to say when they agree', () => {
    expect(sizingStockCheck(form())).toBeNull();
    expect(sizingStockCheck({ tasks: [], materials: [] })).toBeNull();
    expect(sizingStockCheck(form({ currentRingSize: '6', materials: [] }))).toBeNull(); // one size: the task covers it
  });

  it('a size edited after the read: the stock is now wrong, and the check says by how much', () => {
    expect(sizingStockCheck(form({ desiredRingSize: '9' }))).toMatchObject({ want: 3, have: 1, moved: 4 });
    expect(sizingStockCheck(form({ desiredRingSize: '6' }))).toMatchObject({ want: 0, have: 1 });
  });

  it('a size-up added by hand with no stock; two rings; the customer\'s gold', () => {
    expect(sizingStockCheck(form({ materials: [] }))).toMatchObject({ want: 1, have: 0, line: null });
    expect(sizingStockCheck(form({ tasks: [{ ...TASKS[1], quantity: 2 }] }))).toMatchObject({ want: 2, have: 1 });
    expect(sizingStockCheck(form({ tasks: [task('c', 'Size Up (Customer Supplied Gold)', { quantity: 1 })] }))).toMatchObject({ want: 0, have: 1 });
  });
});

describe('Codex review of #346', () => {
  it('two stock lines: the fix makes the TOTAL right, not the first line', () => {
    const two = { currentRingSize: '5', desiredRingSize: '9', tasks: [{ ...TASKS[1], quantity: 1 }],
      materials: [{ ...MATERIALS[1], id: 1, quantity: 1 }, { ...MATERIALS[2], id: 2, quantity: 1 }] };
    expect(sizingStockCheck(two)).toMatchObject({ want: 3, have: 2, lineQuantity: 2 });
    // Too much on the other line: the first is removed rather than set to a negative number.
    expect(sizingStockCheck({ ...two, desiredRingSize: '7' })).toMatchObject({ want: 1, have: 2, lineQuantity: 0 });
  });

  it('a re-read that changes the metal drops the old purity and colour', async () => {
    const h = harness();
    act(() => h.result.current.setFormData((p) => ({ ...p, metalType: 'silver', karat: '925' })));
    await read(h, 'gold ring retip 2 prongs', { metalType: 'gold', isRing: true, matchedTasks: [{ id: 'retip', quantity: 2 }] });
    expect(h.result.current.formData).toMatchObject({ metalType: 'gold', karat: '', goldColor: 'yellow' });
    const g = harness();
    act(() => g.result.current.setFormData((p) => ({ ...p, metalType: 'gold', karat: '14k', goldColor: 'white' })));
    await read(g, 'sterling silver ring, laser weld', { metalType: 'silver', isRing: true, matchedTasks: [{ id: 'weld', quantity: 1 }] });
    expect(g.result.current.formData).toMatchObject({ metalType: 'silver', karat: '925', goldColor: '' });
  });
});

describe('round 2 sweep, 2026-11-09 — the jeweler\'s hand, a failed read, a stale read', () => {
  const white = { metalType: 'gold', karat: '14k', goldColor: 'white', isRing: true };

  it('a re-read keeps a quantity he changed and does not put back a line he deleted', async () => {
    const h = harness();
    await read(h, '14k wg ring retip prongs', { ...white, matchedTasks: [{ id: 'retip', quantity: 1 }] });
    expect(lines(h)).toBe('retipx1 rhx1');
    // By hand: six prongs, and no rhodium.
    act(() => h.result.current.setFormData((p) => ({ ...p, tasks: p.tasks.filter((t) => t._id !== 'rh').map((t) => (t._id === 'retip' ? { ...t, quantity: 6 } : t)) })));
    // The mic stops and re-reads: "…and weld".
    await read(h, '14k wg ring retip prongs and laser weld', { ...white, matchedTasks: [{ id: 'retip', quantity: 1 }, { id: 'weld', quantity: 1 }] });
    expect(lines(h)).toBe('retipx6 weldx1');
    // His line now: it no longer claims to be from the sentence.
    expect(h.result.current.formData.tasks.find((t) => t._id === 'retip').__aiQuantity).toBeUndefined();
  });

  it('the AI fails on a corrected sentence: the earlier read\'s lines, stock and sizes go; his own line stays', async () => {
    const h = harness();
    await read(h, '14k yg ring size up 5 to 8', { metalType: 'gold', karat: '14k', goldColor: 'yellow', isRing: true, currentRingSize: '5', desiredRingSize: '8' });
    act(() => h.result.current.setFormData((p) => ({ ...p, tasks: [...p.tasks, { ...TASKS[5], id: 99, quantity: 1 }] })));
    fail = true;
    await read(h, 'silver chain, fix clasp', {});
    expect(lines(h)).toBe('weldx1');
    expect(h.result.current.formData).toMatchObject({ metalType: 'silver', materials: [], currentRingSize: '', desiredRingSize: '', isRing: false });
    expect(h.result.current.notes.fallback).toBe(true);
  });

  it('two reads in flight: only the latest lands', async () => {
    const h = harness();
    let releaseFirst;
    const first = new Promise((resolve) => { releaseFirst = resolve; });
    let calls = 0;
    global.fetch = vi.fn(async (_url, init) => {
      const body = JSON.parse(init.body);
      const mine = ++calls;
      if (mine === 1) await first;
      const raw = mine === 1
        ? { metalType: 'gold', karat: '14k', goldColor: 'yellow', isRing: true, currentRingSize: '5', desiredRingSize: '8' }
        : { metalType: 'silver', isRing: true, currentRingSize: '8', desiredRingSize: '7' };
      const parsed = decideIntake(raw, { tasks: body.tasks, inputText: body.inputText, formMetal: body.metal });
      return { ok: true, status: 200, json: async () => ({ success: true, data: { parsed } }) };
    });
    act(() => h.result.current.setFormData((p) => ({ ...p, smartIntakeInput: '14k yg ring 5 to 8' })));
    let slow;
    act(() => { slow = h.result.current.handleAnalyzeSmartIntake(); });
    act(() => h.result.current.setFormData((p) => ({ ...p, smartIntakeInput: 'silver ring size down 8 to 7' })));
    await act(async () => { await h.result.current.handleAnalyzeSmartIntake(); });
    await act(async () => { releaseFirst(); await slow; });
    expect(lines(h)).toBe('downx1');
    expect(h.result.current.formData).toMatchObject({ metalType: 'silver', currentRingSize: '8', desiredRingSize: '7', materials: [] });
  });

  it('with the AI down, a karat or a count is never read as a ring size, and "restring" is not a ring', () => {
    expect(explicitRingSizes('resize 14k wg ring')).toEqual({ currentRingSize: '', desiredRingSize: '' });
    expect(explicitRingSizes('size 10k yg ring down')).toEqual({ currentRingSize: '', desiredRingSize: '' });
    expect(explicitRingSizes('retip 2 to 3 prongs on ring')).toEqual({ currentRingSize: '', desiredRingSize: '' });
    expect(explicitRingSizes('14k wg ring size 7.5 to 6')).toEqual({ currentRingSize: '7.5', desiredRingSize: '6' });
    expect(explicitRingSizes('ring from a 5 to a 7')).toEqual({ currentRingSize: '5', desiredRingSize: '7' });
    expect(explicitRingSizes('silver ring: 7.25 needs to be 6.75')).toEqual({ currentRingSize: '7.25', desiredRingSize: '6.75' });
    expect([saysRing('restring pearls, 14k clasp'), saysRing('earring post'), saysRing('14k ring'), saysRing('wedding band')]).toEqual([false, false, true, true]);
  });

  it('sizing stock for another metal is not added: a silver ring does not get yellow gold stock', () => {
    const gold = [{ _id: 'g', name: '14k Yellow Gold Sizing Stock', category: 'sizing_material' }];
    const hints = [{ type: 'sizing_material', quantity: 2 }];
    expect(sizingStockItemsFor(hints, gold, { metalType: 'silver', karat: '925' })).toEqual({ items: [], missing: true });
    expect(sizingStockItemsFor(hints, gold, { metalType: 'gold', karat: '14k', goldColor: 'yellow' }).items).toHaveLength(1);
    // A stock that names no metal prices by the ticket's metal: it fits any.
    expect(sizingStockItemsFor(hints, MATERIALS, { metalType: 'silver', karat: '925' }).items.map((m) => m._id)).toEqual(['s32']);
  });
});

describe('ticketChecks — the rulings against the ticket as it stands now', () => {
  const CATALOG = [...TASKS, task('upPt', 'Size Up (1 size) — Platinum (laser welded)', { metals: ['platinum'] })];
  const line = (t, extra = {}) => ({ ...t, id: Math.random(), quantity: 1, ...extra });

  it('white gold picked after the read: rhodium is missing, and the check offers it', () => {
    const checks = ticketChecks({ metalType: 'gold', goldColor: 'white', tasks: [line(TASKS[1])] }, CATALOG);
    expect(checks.map((c) => c.key)).toEqual(['rhodium-missing']);
    expect(checks[0].add._id).toBe('rh');
    expect(ticketChecks({ metalType: 'gold', goldColor: 'white', tasks: [line(TASKS[1]), line(TASKS[3])] }, CATALOG)).toEqual([]);
  });

  it('no longer white gold: rhodium the RULE added is offered for removal; rhodium he added is left alone', () => {
    const ruled = line(TASKS[3], { _smartIntakeRuled: 'white gold' });
    expect(ticketChecks({ metalType: 'gold', goldColor: 'yellow', tasks: [line(TASKS[4]), ruled] }, CATALOG)).toMatchObject([{ key: 'rhodium-extra', remove: ruled.id }]);
    expect(ticketChecks({ metalType: 'gold', goldColor: 'yellow', tasks: [line(TASKS[4]), line(TASKS[3])] }, CATALOG)).toEqual([]);
  });

  it('platinum picked after the read: the gold-solder sizing task should be the platinum one', () => {
    const up = line(TASKS[1]);
    const checks = ticketChecks({ metalType: 'platinum', tasks: [up] }, CATALOG);
    expect(checks).toMatchObject([{ swap: { id: up.id, task: { _id: 'upPt' } } }]);
    expect(checks[0].message).toMatch(/not the platinum version/);
    // Gold: nothing to swap.
    expect(ticketChecks({ metalType: 'gold', goldColor: 'yellow', tasks: [up] }, CATALOG)).toEqual([]);
  });

  it('says nothing on an empty ticket or before the tasks have loaded', () => {
    expect(ticketChecks({ metalType: 'gold', goldColor: 'white', tasks: [] }, CATALOG)).toEqual([]);
    expect(ticketChecks({ metalType: 'gold', goldColor: 'white', tasks: [line(TASKS[1])] }, [])).toEqual([]);
  });
});
