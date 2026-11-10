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
    expect(checks[0]).toMatchObject({ add: { _id: 'rh' }, quantity: 1, action: 'Add rhodium' });
    // Two rings: two rhodiums (Codex review of #347).
    expect(ticketChecks({ metalType: 'gold', goldColor: 'white', tasks: [line(TASKS[1], { quantity: 2 })] }, CATALOG)[0]).toMatchObject({ quantity: 2, action: 'Add rhodium x2' });
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

describe('round 3 sweep, 2026-11-09 — the ticket as it stands at the save', () => {
  const yellow = { metalType: 'gold', karat: '14k', isRing: true, currentRingSize: '6', desiredRingSize: '8' };

  it('a second read of the same sentence keeps the colour "assumed"; picking a colour clears it', async () => {
    const h = harness();
    await read(h, 'size up 14k ring 6 to 8', yellow);
    expect(h.result.current.notes.assumed.goldColor).toBe('yellow');
    await read(h, 'size up 14k ring 6 to 8', yellow); // the mic stops and re-reads
    expect(h.result.current.notes.assumed.goldColor).toBe('yellow');
    // He picks white on Review, then it re-reads: white is his, not assumed.
    act(() => h.result.current.setFormData((p) => ({ ...p, goldColor: 'white' })));
    await read(h, 'size up 14k ring 6 to 8', yellow);
    expect(h.result.current.notes.assumed.goldColor).toBe('');
    expect(h.result.current.formData.goldColor).toBe('white');
  });

  it('a hand line the sentence counts differently is kept, and said', async () => {
    const h = harness();
    act(() => h.result.current.setFormData((p) => ({ ...p, tasks: [{ ...TASKS[4], id: 77, quantity: 1 }] })));
    await read(h, '14k yg ring retip 4 prongs', { metalType: 'gold', karat: '14k', goldColor: 'yellow', isRing: true, matchedTasks: [{ id: 'retip', quantity: 4 }] });
    expect(lines(h)).toBe('retipx1');
    expect(h.result.current.notes.warnings.join(' ')).toMatch(/"Retip prongs" is on the ticket at 1 by hand; the sentence reads as 4/);
  });

  it('he deleted the size-up line: a re-read does not leave sizing stock on its own', async () => {
    const h = harness();
    await read(h, '14k yg ring size up 5 to 8', { ...yellow, goldColor: 'yellow', currentRingSize: '5' });
    expect(h.result.current.formData.materials).toHaveLength(1);
    act(() => h.result.current.setFormData((p) => ({ ...p, tasks: [] })));
    await read(h, '14k yg ring size up 5 to 8', { ...yellow, goldColor: 'yellow', currentRingSize: '5' });
    expect(lines(h)).toBe('');
    expect(h.result.current.formData.materials).toEqual([]);
  });
});

describe('ticketChecks, round 4 — the direction of the sizes, and a task for another metal', () => {
  const PT = task('upPt', 'Size Up (1 size) — Platinum (laser welded)', { metals: ['platinum'] });
  const CATALOG = [...TASKS, task('upCust', 'Size Up (Customer Supplied Gold)'), PT];
  const line = (t, extra = {}) => ({ ...t, id: `${t._id}-line`, quantity: 1, ...extra });

  it('sizes edited to go down with Size Up on the ticket: the check offers Size Down', () => {
    const checks = ticketChecks({ metalType: 'gold', goldColor: 'yellow', currentRingSize: '6', desiredRingSize: '5', tasks: [line(TASKS[1])] }, CATALOG);
    expect(checks).toMatchObject([{ key: 'direction-up3-line', action: 'Switch it', swap: { id: 'up3-line', task: { _id: 'down' } } }]);
    expect(checks[0].message).toBe('The sizes go down (6 → 5), and this ticket has "Size up (1 size) - up to 3mm x 2 mm shank". It should be "Size Down".');
    // The other way, and the right way.
    expect(ticketChecks({ metalType: 'gold', goldColor: 'yellow', currentRingSize: '5', desiredRingSize: '6', tasks: [line(TASKS[0])] }, CATALOG)[0].swap.task._id).toBe('up3');
    expect(ticketChecks({ metalType: 'gold', goldColor: 'yellow', currentRingSize: '5', desiredRingSize: '6', tasks: [line(TASKS[1])] }, CATALOG)).toEqual([]);
  });

  it('a platinum task on a ticket changed to gold is said even though three size-ups tie', () => {
    const checks = ticketChecks({ metalType: 'gold', goldColor: 'yellow', tasks: [line(PT)] }, CATALOG);
    expect(checks).toMatchObject([{ key: 'metal-upPt-line', swap: { task: { _id: 'up3' } } }]);
    expect(checks[0].message).toMatch(/is a platinum task, and this ticket is gold\. It should be "Size up \(1 size\) - up to 3mm x 2 mm shank"/);
  });

  it('stock when the ring is not going up says so in plain words', () => {
    const check = sizingStockCheck({ currentRingSize: '6', desiredRingSize: '5', tasks: [line(TASKS[1])], materials: [{ id: 9, name: '3x2 mm Flat Sizing Stock', category: 'sizing_material', quantity: 2 }] });
    expect(check).toMatchObject({ want: 0, have: 2, lineQuantity: 0 });
  });
});

describe('Codex review of #348', () => {
  it('stock left off because the size-up line was deleted is not "deleted by hand": a corrected sentence gets its stock', async () => {
    const h = harness();
    const up = { metalType: 'gold', karat: '14k', goldColor: 'yellow', isRing: true, currentRingSize: '5', desiredRingSize: '8' };
    await read(h, '14k yg ring size up 5 to 8', up);
    act(() => h.result.current.setFormData((p) => ({ ...p, tasks: [] })));
    await read(h, '14k yg ring size up 5 to 8', up);
    expect(h.result.current.formData.materials).toEqual([]);
    // Corrected to a wide band: a different size-up task, and it needs its stock.
    await read(h, '14k yg ring, 5 mm band, size up 5 to 8', { ...up, matchedTasks: [{ id: 'up5', quantity: 1 }] });
    expect(lines(h)).toBe('up5x1');
    expect(stockQty(h)).toBe('s52x2');
  });

  it('both sizing directions on the ticket: no direction check, and the wrong-way line is still held against the metal', () => {
    const upPt = task('upPt', 'Size Up (1 size) — Platinum (laser welded)', { metals: ['platinum'] });
    const downPt = task('downPt', 'Size Down — Platinum (laser welded)', { metals: ['platinum'] });
    const checks = ticketChecks(
      { metalType: 'platinum', currentRingSize: '8', desiredRingSize: '6', tasks: [{ ...TASKS[1], id: 1, quantity: 1 }, { ...downPt, id: 2, quantity: 1 }] },
      [...TASKS, upPt, downPt],
    );
    expect(checks).toMatchObject([{ key: 'swap-1', swap: { task: { _id: 'upPt' } } }]);
  });
});

describe('round 4 sweep, 2026-11-09', () => {
  const up = { metalType: 'gold', karat: '14k', goldColor: 'yellow', isRing: true, currentRingSize: '6', desiredRingSize: '8' };

  it('sizing stock with no size-up line is flagged: after a switch to size down, or a deleted size-up', async () => {
    const h = harness();
    await read(h, '14k yg ring size 6 to 8', up);
    expect(stockQty(h)).toBe('s32x1');
    // He flips the sizes and switches the task.
    act(() => h.result.current.setFormData((p) => ({ ...p, currentRingSize: '8', desiredRingSize: '6', tasks: [{ ...TASKS[0], id: 5, quantity: 1 }] })));
    expect(sizingStockCheck(h.result.current.formData)).toMatchObject({ want: 0, have: 1, lineQuantity: 0, orphan: true });
    // Deleted outright, with other work on the ticket.
    act(() => h.result.current.setFormData((p) => ({ ...p, currentRingSize: '6', desiredRingSize: '8', tasks: [{ ...TASKS[4], id: 6, quantity: 1 }] })));
    expect(sizingStockCheck(h.result.current.formData)).toMatchObject({ orphan: true });
    // And the sizes still change with nothing sizing the ring.
    expect(ticketChecks(h.result.current.formData, TASKS)).toMatchObject([{ key: 'sizing-missing', action: 'Add size up', add: { _id: 'up3' }, why: 'the ring changes size' }]);
    // Not on an empty ticket, and not beside shank work he may have added stock for.
    expect(sizingStockCheck({ tasks: [], materials: h.result.current.formData.materials })).toBeNull();
    expect(sizingStockCheck({ tasks: [{ title: 'Half-Shank — up to 3mm' }], materials: h.result.current.formData.materials })).toBeNull();
  });

  it('a size-up he deleted is not put back, and the screen does not say it was added', async () => {
    const h = harness();
    await read(h, '14k yg ring retip 2 prongs size 6 to 7', { ...up, desiredRingSize: '7', matchedTasks: [{ id: 'retip', quantity: 2 }] });
    expect(lines(h)).toBe('up3x1 retipx2');
    act(() => h.result.current.setFormData((p) => ({ ...p, tasks: p.tasks.filter((t) => t._id !== 'up3') })));
    await read(h, '14k yg ring retip 2 prongs size 6 to 9', { ...up, desiredRingSize: '9', matchedTasks: [{ id: 'retip', quantity: 2 }] });
    expect(lines(h)).toBe('retipx2');
    expect(h.result.current.notes.warnings.join(' ')).not.toMatch(/Added "Size up/);
    expect(ticketChecks(h.result.current.formData, TASKS).map((c) => c.key)).toEqual(['sizing-missing']);
  });

  it('sizes he corrected by hand survive a re-read, and the difference is said', async () => {
    const h = harness();
    await read(h, '14k yg ring size 6 to 8', up);
    act(() => h.result.current.setFormData((p) => ({ ...p, desiredRingSize: '7' })));
    await read(h, '14k yg ring size 6 to 8 also polish', up);
    expect(h.result.current.formData).toMatchObject({ currentRingSize: '6', desiredRingSize: '7' });
    expect(h.result.current.notes.warnings.join(' ')).toMatch(/The sizes were left as you set them \(6 → 7\)\. The sentence reads 6 → 8\./);
    // Untouched sizes still follow the sentence.
    const g = harness();
    await read(g, '14k yg ring size 6 to 8', up);
    await read(g, '14k yg ring size 6 to 9', { ...up, desiredRingSize: '9' });
    expect(g.result.current.formData.desiredRingSize).toBe('9');
  });

  it('a gold karat the note never said is assumed, not ticked', async () => {
    const h = harness();
    await read(h, 'gold ring size 6 to 8', up);
    expect(h.result.current.notes.assumed).toMatchObject({ karat: '14k', goldColor: 'yellow' });
    const g = harness();
    await read(g, '14k gold ring size 6 to 8', up);
    expect(g.result.current.notes.assumed.karat).toBe('');
  });
});

describe('round 5 sweep, 2026-11-09', () => {
  const answer = { metalType: 'gold', karat: '14k', goldColor: 'yellow', isRing: true, currentRingSize: '5', desiredRingSize: '7' };

  it('a karat the note never said does not replace one he picked, and is not ticked', async () => {
    const h = harness();
    act(() => h.result.current.setFormData((p) => ({ ...p, metalType: 'gold', karat: '18k', goldColor: 'yellow' })));
    await read(h, 'gold ring size up 5 to 7', { ...answer, goldColor: '' });
    expect(h.result.current.formData).toMatchObject({ metalType: 'gold', karat: '18k' });
    expect(h.result.current.notes.assumed.karat).toBe('');
  });

  it('a metal he corrected after the read survives a re-read, the difference is said, and the rhodium check stays', async () => {
    const h = harness();
    await read(h, '14k yg ring size up 5 to 7', answer);
    act(() => h.result.current.setFormData((p) => ({ ...p, karat: '18k', goldColor: 'white' })));
    expect(ticketChecks(h.result.current.formData, TASKS).map((c) => c.key)).toEqual(['rhodium-missing']);
    await read(h, '14k yg ring size up 5 to 7 and polish', answer);
    expect(h.result.current.formData).toMatchObject({ metalType: 'gold', karat: '18k', goldColor: 'white' });
    expect(h.result.current.notes.warnings.join(' ')).toMatch(/The metal was left as you set it \(18k white gold\)\. The sentence reads 14k yellow gold\./);
    expect(ticketChecks(h.result.current.formData, TASKS).map((c) => c.key)).toEqual(['rhodium-missing']);
    // A metal he never touched still follows the sentence.
    const g = harness();
    await read(g, '14k yg ring size up 5 to 7', answer);
    await read(g, '18k wg ring size up 5 to 7', { ...answer, karat: '18k', goldColor: 'white' });
    expect(g.result.current.formData).toMatchObject({ karat: '18k', goldColor: 'white' });
  });

  it('a wide size-up with 3x2 stock is flagged, with the count right', () => {
    const base = { currentRingSize: '5', desiredRingSize: '7', materials: [{ id: 1, name: '3x2 mm Flat Sizing Stock', category: 'sizing_material', quantity: 1 }] };
    expect(sizingStockCheck({ ...base, tasks: [{ ...TASKS[2], id: 2, quantity: 1 }] })).toMatchObject({ width: { wide: true, stock: '3x2 mm Flat Sizing Stock' }, line: null });
    expect(sizingStockCheck({ ...base, tasks: [{ ...TASKS[1], id: 2, quantity: 1 }] })).toBeNull();
    expect(sizingStockCheck({ ...base, materials: [{ ...base.materials[0], name: '5x2 mm Flat Sizing Stock' }], tasks: [{ ...TASKS[1], id: 2, quantity: 1 }] })).toMatchObject({ width: { wide: false } });
  });

  it('a line he deleted that the sentence asks for again is not put back — and that is said', async () => {
    const h = harness();
    const retip = (n) => ({ metalType: 'gold', karat: '14k', goldColor: 'yellow', isRing: true, matchedTasks: [{ id: 'retip', quantity: n }] });
    await read(h, '14k yg ring retip 4 prongs', retip(4));
    act(() => h.result.current.setFormData((p) => ({ ...p, tasks: [] })));
    await read(h, '14k yg ring retip 6 prongs and laser weld', { ...retip(6), matchedTasks: [{ id: 'retip', quantity: 6 }, { id: 'weld', quantity: 1 }] });
    expect(lines(h)).toBe('weldx1');
    expect(h.result.current.notes.warnings.join(' ')).toMatch(/"Retip prongs" was read from the sentence, but you removed it from this ticket earlier/);
  });

  it('the rhodium check says one is added when nothing counts the pieces', () => {
    const [check] = ticketChecks({ metalType: 'gold', goldColor: 'white', tasks: [{ ...TASKS[4], id: 1, quantity: 2 }] }, TASKS);
    expect(check.message).toMatch(/One is added — set the count if this is more than one piece/);
  });
});

describe('Codex review of #350', () => {
  it('changing the assumed karat leaves the untouched colour assumed', async () => {
    const h = harness();
    const answer = { metalType: 'gold', karat: '14k', isRing: true, matchedTasks: [{ id: 'weld', quantity: 1 }] };
    await read(h, 'gold ring laser weld', answer);
    expect(h.result.current.notes.assumed).toMatchObject({ karat: '14k', goldColor: 'yellow' });
    act(() => h.result.current.setFormData((p) => ({ ...p, karat: '18k' })));
    await read(h, 'gold ring laser weld', answer);
    expect(h.result.current.formData).toMatchObject({ karat: '18k', goldColor: 'yellow' });
    expect(h.result.current.notes.assumed).toMatchObject({ karat: '', goldColor: 'yellow' });
  });
});

describe('round 6 sweep, 2026-11-10', () => {
  const up = { metalType: 'gold', karat: '14k', goldColor: 'white', isRing: true, currentRingSize: '6', desiredRingSize: '8' };

  it('a metal nobody named is assumed, with its purity — silver guessed onto a blank form is not ticked', async () => {
    const h = harness();
    await read(h, 'ring going up from 6 to 8', { metalType: 'silver', isRing: true, currentRingSize: '6', desiredRingSize: '8' });
    expect(h.result.current.formData).toMatchObject({ metalType: 'silver', karat: '925' });
    expect(h.result.current.notes.assumed.metal).toBe('silver');
    const g = harness();
    await read(g, 'silver ring going up from 6 to 8', { metalType: 'silver', isRing: true, currentRingSize: '6', desiredRingSize: '8' });
    expect(g.result.current.notes.assumed.metal).toBe('');
  });

  it('the AI goes down after he corrected the sizes and karat: his corrections stay', async () => {
    const h = harness();
    await read(h, '14k wg ring size 6 to 8', up);
    act(() => h.result.current.setFormData((p) => ({ ...p, desiredRingSize: '7', karat: '18k' })));
    fail = true;
    await read(h, '14k wg ring size 6 to 8 and polish', {});
    expect(h.result.current.formData).toMatchObject({ currentRingSize: '6', desiredRingSize: '7', karat: '18k', goldColor: 'white' });
    expect(h.result.current.notes.fallback).toBe(true);
  });

  it('an edit made while a read is in flight is not undone', async () => {
    const h = harness();
    await read(h, '14k wg ring size 6 to 8', up);
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    global.fetch = vi.fn(async (_url, init) => {
      await gate;
      const body = JSON.parse(init.body);
      const parsed = decideIntake(up, { tasks: body.tasks, inputText: body.inputText, formMetal: body.metal });
      return { ok: true, status: 200, json: async () => ({ success: true, data: { parsed } }) };
    });
    act(() => h.result.current.setFormData((p) => ({ ...p, smartIntakeInput: '14k wg ring size 6 to 8 and polish' })));
    let pending;
    act(() => { pending = h.result.current.handleAnalyzeSmartIntake(); });
    act(() => h.result.current.setFormData((p) => ({ ...p, desiredRingSize: '7' }))); // while the call is out
    await act(async () => { release(); await pending; });
    expect(h.result.current.formData.desiredRingSize).toBe('7');
  });

  it('rule-added rhodium follows the sizing line\'s count', () => {
    const rh = { ...TASKS[3], id: 2, quantity: 2, _smartIntakeRuled: 'white gold' };
    const checks = ticketChecks({ metalType: 'gold', goldColor: 'white', tasks: [{ ...TASKS[1], id: 1, quantity: 1 }, rh] }, TASKS);
    expect(checks).toMatchObject([{ key: 'rhodium-count', action: 'Make it 1', setQuantity: { id: 2, quantity: 1 } }]);
    // Rhodium he set himself is left alone.
    expect(ticketChecks({ metalType: 'gold', goldColor: 'white', tasks: [{ ...TASKS[1], id: 1, quantity: 1 }, { ...TASKS[3], id: 2, quantity: 2 }] }, TASKS)).toEqual([]);
  });
});

describe('round 7 sweep, 2026-11-10', () => {
  const up = { metalType: 'gold', karat: '14k', goldColor: 'yellow', isRing: true, currentRingSize: '6', desiredRingSize: '8' };

  it('a stock quantity he set by hand survives a re-read', async () => {
    const h = harness();
    await read(h, '14k yg ring size 6 to 8', up);
    act(() => h.result.current.setFormData((p) => ({ ...p, desiredRingSize: '9.5', materials: p.materials.map((m) => ({ ...m, quantity: 3 })) })));
    await read(h, '14k yg ring size 6 to 8 and polish', up);
    expect(stockQty(h)).toBe('s32x3');
    expect(sizingStockCheck(h.result.current.formData)).toBeNull();
  });

  it('the AI goes down on a ring: the sizes the last read set stay, so the missing sizing job is flagged', async () => {
    const h = harness();
    await read(h, '14k yg ring size up 6 to 8, retip 4 prongs', { ...up, matchedTasks: [{ id: 'retip', quantity: 4 }] });
    fail = true;
    await read(h, '14k yg ring size up 6 to 8, retip 4 prongs and polish', {});
    expect(h.result.current.formData).toMatchObject({ currentRingSize: '6', desiredRingSize: '8' });
    act(() => h.result.current.setFormData((p) => ({ ...p, tasks: [{ ...TASKS[4], id: 9, quantity: 4 }] })));
    expect(ticketChecks(h.result.current.formData, TASKS).map((c) => c.key)).toEqual(['sizing-missing']);
  });

  it('an assumed colour is not sent back as the form\'s metal, so the note\'s "w/g" wins on a re-read', async () => {
    const h = harness();
    await read(h, '14k ring size 7 to 6', { metalType: 'gold', karat: '14k', isRing: true, currentRingSize: '7', desiredRingSize: '6' });
    expect(h.result.current.notes.assumed.goldColor).toBe('yellow');
    await read(h, '14k w/g ring size 7 to 6', { metalType: 'gold', karat: '14k', goldColor: 'white', isRing: true, currentRingSize: '7', desiredRingSize: '6' });
    expect(JSON.parse(global.fetch.mock.calls.at(-1)[1].body).metal.goldColor).toBe('');
    expect(h.result.current.formData.goldColor).toBe('white');
    expect(lines(h)).toBe('downx1 rhx1');
  });

  it('a corrected piece count names the lines still at the old count', () => {
    const tasks = [{ ...TASKS[1], id: 1, quantity: 1, __aiQuantity: 2 }, { ...TASKS[5], id: 2, quantity: 2, __aiQuantity: 2 }];
    const checks = ticketChecks({ metalType: 'gold', goldColor: 'yellow', tasks }, TASKS, { pieces: 2 });
    expect(checks.map((c) => c.key)).toEqual(['piece-count']);
    expect(checks[0].message).toMatch(/read as 2 pieces .* is now 1\. Still at 2: "Laser Weld"/);
    expect(ticketChecks({ metalType: 'gold', goldColor: 'yellow', tasks: [{ ...tasks[0], quantity: 2 }, tasks[1]] }, TASKS, { pieces: 2 })).toEqual([]);
  });
});

describe('Codex review of #352', () => {
  it('stock he changed by hand is his from then on, even if he sets it back to the number the read gave', async () => {
    const h = harness();
    const up = { metalType: 'gold', karat: '14k', goldColor: 'yellow', isRing: true, currentRingSize: '5', desiredRingSize: '8' };
    await read(h, '14k yg ring size 5 to 8', up);
    expect(stockQty(h)).toBe('s32x2');
    act(() => h.result.current.setFormData((p) => ({ ...p, materials: p.materials.map((m) => ({ ...m, quantity: 3 })) })));
    await read(h, '14k yg ring size 5 to 8', up);
    expect(h.result.current.formData.materials[0]._smartIntakeHintType).toBeUndefined();
    // Back to 2 by hand, then a read that would give 1: his 2 stays.
    act(() => h.result.current.setFormData((p) => ({ ...p, materials: p.materials.map((m) => ({ ...m, quantity: 2 })) })));
    await read(h, '14k yg ring size 5 to 7', { ...up, desiredRingSize: '7' });
    expect(stockQty(h)).toBe('s32x2');
  });
});
