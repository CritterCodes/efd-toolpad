import { describe, it, expect } from 'vitest';
import {
  parseRingSize, statesWideShank, statedPieceCount, sizesMoved, taskRoles, narrowSiblingOf, decideIntake,
  withPieceCount, withSizingStock, normalizeParsedPayload, TASK_CAP, normalizeGoldColor, sizingStockFor,
  describesDifferentWorkPerPiece, MAX_SIZES_MOVED,
} from './smartIntakeRules';

// The live titles, 2026-11-09 (test/fixtures/smart-intake/catalog.json holds the real catalog).
const tasks = [
  { id: 'down', title: 'Size Down' },
  { id: 'up3', title: 'Size up (1 size) - up to 3mm x 2 mm shank' },
  { id: 'up5', title: 'Size Up  - 3mm to 5mm shanks' },
  { id: 'upCust', title: 'Size Up (Customer Supplied Gold)' },
  { id: 'upPt', title: 'Size Up (1 size) — Platinum (laser welded)', metals: ['platinum'] },
  { id: 'hs3', title: 'Half-Shank — up to 3mm' },
  { id: 'hs5', title: 'Half-Shank — 3 to 5mm' },
  { id: 'beads', title: 'Sizing Beads' },
  { id: 'rh', title: 'Rhodium Plating' },
  { id: 'retip', title: 'Retip prongs' },
  { id: 'solder', title: 'Solder Together per Ring' },
  { id: 'weld', title: 'Laser Weld' },
];
const decide = (raw, inputText = '', formMetal = {}) => decideIntake(raw, { tasks, inputText, formMetal });
const lines = (out) => out.matchedTasks.map((m) => `${m.id}x${m.quantity}`).join(' ');
const stock = (out) => out.materialHints.reduce((n, h) => n + h.quantity, 0);

describe('parseRingSize', () => {
  it('reads the ways a size is written and said', () => {
    expect(['7', '7.25', '7 1/2', '7½', '7 and a half', 'size 7', 'sz 6.5', '8 3/4', '6 and a quarter'].map(parseRingSize))
      .toEqual([7, 7.25, 7.5, 7.5, 7.5, 7, 6.5, 8.75, 6.25]);
  });
  it('is null — never 0 — for anything that is not one size', () => {
    for (const v of ['', 'abc', '0', '6.5-7', '7 or 8', '7.5 1/2', '45', null, undefined]) expect(parseRingSize(v), String(v)).toBeNull();
  });
});

describe('statesWideShank', () => {
  it('a stated width over 3mm, or the word for it next to the band', () => {
    for (const t of ['3.5 mm band', '4 millimeter band', '5x2 mm shank', '14k yellow gold, 5 mm band, size up 2 sizes', 'wide band',
      'the shank is thick', 'heavy mens band size up', 'cigar band 8 to 9']) {
      expect(statesWideShank(t), t).toBe(true);
    }
  });
  it('a stone, its cut, a setting, a chain or wear is not the shank', () => {
    for (const t of ['6mm stone', '4 mm round diamond', 'heavy wear on prongs', '3x2 mm shank', '2 mm band', 'size 5 to 7', '5mm jump ring',
      '20 mm chain', '4mm princess cut', 'center is 6.5mm', '5 mm bezel']) {
      expect(statesWideShank(t), t).toBe(false);
    }
  });
});

describe('statedPieceCount', () => {
  it('counts pieces the sentence plainly counts', () => {
    expect(statedPieceCount('size from 8.75 to 7.25, Rhodium plating, 2 rings')).toBe(2);
    expect(statedPieceCount('two white gold rings size down')).toBe(2);
    expect(statedPieceCount('14k white gold. Size all 3 to a 6')).toBe(3);
    expect(statedPieceCount('Solder together two rings')).toBe(2);
    expect(statedPieceCount('both bands need polishing')).toBe(2);
    // The shorthand the prompt itself teaches (Codex review of #345).
    for (const t of ['two 14kt white gold rings', 'two ss rings', '2 14k wg bands size down', 'three pt rings', 'two 18 karat yellow gold rings']) {
      expect(statedPieceCount(t), t).toBeGreaterThan(1);
    }
  });
  it('a size, a measurement or a count of parts is not a count of pieces', () => {
    for (const t of ['Three laser welds, two jump rings', '14k yg rings size 8 needs to be size 8', 'size 8 ring to a 6',
      '14k yellow gold, 5 mm band, size up 2 sizes', '20 inch chain', '14 karat ring', 'retip 4 prongs', 'set 3 stones',
      // Codex review of #344: the "5" of 7.5, and a count of prongs with a ring later in the sentence.
      'size 7.5 ring down to 6', 'retip 4 prongs on a ring', '6.25 ring needs to be 5.5', 'set 3 stones in the ring',
      '2 laser welds on a bracelet', 'size 10 band to an 8',
      // Round 1 sweep: a count of prongs after "all", a band WITH five diamonds, a size-7 ring, one of a pair.
      'wg retip all 4 prongs size 5 to 7', 'retip all 14 and polish', '5 diamond band retip', '7 ring needs to be 6', 'fix 1 of 2 rings']) {
      expect(statedPieceCount(t), t).toBe(1);
    }
  });
});

describe('taskRoles — the only place a title is read', () => {
  it('finds each ruling\'s task, and prefers plain rhodium over a variant', () => {
    const roles = taskRoles([{ id: 'black', title: 'Black Rhodium Accent' }, ...tasks]);
    expect([roles.rhodium.id, roles.sizeDown.id, roles.sizeUp.id, roles.solderTogether.id]).toEqual(['rh', 'down', 'up3', 'solder']);
    expect(roles.problems).toEqual([]);
  });
  it('says so, and does nothing, when the catalog is ambiguous or renamed', () => {
    const two = taskRoles([...tasks.filter((t) => t.id !== 'rh'), { id: 'a', title: 'Rhodium (white)' }, { id: 'b', title: 'Rhodium (black)' }]);
    expect(two.rhodium).toBeNull();
    expect(two.problems).toEqual(['rhodium']);
    const renamed = tasks.map((t) => (t.id === 'down' ? { ...t, title: 'Resize smaller' } : t));
    expect(taskRoles(renamed).problems).toEqual(['sizeDown']);
    // A ruling with no task leaves the answer alone rather than guessing.
    const out = decideIntake({ metalType: 'gold', goldColor: 'yellow', currentRingSize: '7', desiredRingSize: '6' }, { tasks: renamed });
    expect(out.matchedTasks).toEqual([]);
  });
  it('the narrow sibling stays within the metal', () => {
    expect(narrowSiblingOf(tasks.find((t) => t.id === 'up5'), tasks).id).toBe('up3');
    expect(narrowSiblingOf(tasks.find((t) => t.id === 'hs5'), tasks).id).toBe('hs3');
    expect(narrowSiblingOf(tasks.find((t) => t.id === 'up3'), tasks)).toBeNull();
  });
});

describe('decideIntake — the owner\'s rulings, in code', () => {
  it('"going up two sizes from 5 to a 7", white gold, no task matched: size up x1, stock x1, rhodium x1', () => {
    const out = decide({ metalType: 'gold', karat: '14k', goldColor: 'white', isRing: true, currentRingSize: '5', desiredRingSize: '7' });
    expect(lines(out)).toBe('up3x1 rhx1');
    expect(stock(out)).toBe(1); // owner, 2026-11-09: "2 sizes up is 1x task and 1x sizing stock material"
    expect(out.warnings).toHaveLength(2);
  });

  it('sizing stock: sizes moved, rounded up, minus the one the task covers', () => {
    const up = (from, to) => stock(decide({ metalType: 'gold', currentRingSize: from, desiredRingSize: to, matchedTasks: [{ id: 'up3', quantity: 1 }] }));
    expect([up('6', '7'), up('4.75', '6'), up('6', '7.5'), up('5', '7'), up('8.5', '12.25'), up('7 1/2', '9')]).toEqual([0, 1, 1, 1, 3, 1]);
  });

  it('no stock going down, with the customer\'s gold, or when the model sends its own number', () => {
    expect(stock(decide({ currentRingSize: '9', desiredRingSize: '6', matchedTasks: [{ id: 'down', quantity: 1 }] }))).toBe(0);
    expect(stock(decide({ currentRingSize: '6', desiredRingSize: '9', matchedTasks: [{ id: 'upCust', quantity: 1 }] }))).toBe(0);
    const lied = decide({ currentRingSize: '7', desiredRingSize: '9', matchedTasks: [{ id: 'up3', quantity: 1 }], materialHints: [{ type: 'sizing_material', quantity: 4 }, { type: 'solder', quantity: 2 }] });
    expect(lied.materialHints).toEqual([expect.objectContaining({ type: 'sizing_material', quantity: 1 })]);
  });

  it('"size up 2 sizes" with no sizes said still sizes and adds stock', () => {
    const out = decide({ metalType: 'gold', goldColor: 'yellow', sizeChange: 2, matchedTasks: [{ id: 'up5', quantity: 1 }] }, '14k yellow gold, 5 mm band, size up 2 sizes');
    expect(lines(out)).toBe('up5x1'); // a 5 mm band was stated, so the wide task stays
    expect(stock(out)).toBe(1);
    expect(sizesMoved({ sizeChange: -0.5 })).toBe(-0.5);
  });

  it('a ring is 3x2 unless a wide shank is stated; a swap never duplicates a line', () => {
    expect(lines(decide({ currentRingSize: '6', desiredRingSize: '7.5', matchedTasks: [{ id: 'up5', quantity: 1 }] }, '10k white gold, size 6 to 7.5'))).toBe('up3x1');
    expect(lines(decide({ matchedTasks: [{ id: 'hs5', quantity: 1 }, { id: 'hs3', quantity: 1 }] }))).toBe('hs3x1');
  });

  it('2 rings: every task and every material twice (owner, 2026-11-09)', () => {
    const out = decide({ metalType: 'gold', goldColor: 'white', currentRingSize: '5', desiredRingSize: '7', pieceCount: 2, matchedTasks: [{ id: 'up3', quantity: 1 }] });
    expect(lines(out)).toBe('up3x2 rhx2');
    expect(stock(out)).toBe(2);
    // The sentence alone is enough: the model forgot the count.
    const said = decide({ metalType: 'gold', goldColor: 'white', currentRingSize: '8.75', desiredRingSize: '7.25', matchedTasks: [{ id: 'rh', quantity: 1 }] }, 'size from 8.75 to 7.25, Rhodium plating, 2 rings');
    expect(lines(said)).toBe('downx2 rhx2');
  });

  it('a per-unit count above the piece count is left alone; one below it is raised', () => {
    const out = withPieceCount({ pieceCount: 2, matchedTasks: [{ id: 'retip', quantity: 8 }, { id: 'down', quantity: 1 }] }, tasks);
    expect(out.matchedTasks).toEqual([{ id: 'retip', quantity: 8 }, { id: 'down', quantity: 2 }]);
  });

  it('retip 14 prongs on one white gold ring is one rhodium', () => {
    expect(lines(decide({ metalType: 'gold', goldColor: 'white', matchedTasks: [{ id: 'retip', quantity: 14 }] }))).toBe('retipx14 rhx1');
  });

  it('solder together: rings minus one, and the joined rings are one piece for the rest (owner, 2026-11-09)', () => {
    const two = decide({ metalType: 'gold', goldColor: 'white', matchedTasks: [{ id: 'solder', quantity: 2 }] }, 'Solder together two rings');
    expect(lines(two)).toBe('solderx1 rhx1');
    expect(lines(decide({ pieceCount: 3, matchedTasks: [{ id: 'solder', quantity: 1 }, { id: 'weld', quantity: 1 }] }))).toBe('solderx2 weldx1');
    // No ring count said: the model's quantity stands.
    expect(lines(decide({ matchedTasks: [{ id: 'solder', quantity: 1 }] }, 'solder rings together'))).toBe('solderx1');
  });

  it('rhodium only on white gold, only with work, never twice', () => {
    expect(lines(decide({ metalType: 'gold', goldColor: 'yellow', matchedTasks: [{ id: 'weld', quantity: 1 }] }))).toBe('weldx1');
    expect(lines(decide({ metalType: 'gold', goldColor: 'white' }))).toBe('');
    expect(lines(decide({ metalType: 'gold', goldColor: 'white', matchedTasks: [{ id: 'rh', quantity: 1 }, { id: 'weld', quantity: 3 }] }))).toBe('rhx1 weldx3');
  });

  it('drops ids the catalog does not have, and says when jobs were cut', () => {
    const out = decide({ matchedTasks: [{ id: 'weld', quantity: 1 }, { id: 'nope', quantity: 1 }] });
    expect(lines(out)).toBe('weldx1');
    expect(out.warnings.join(' ')).toMatch(/Dropped 1 task/);
    const many = normalizeParsedPayload({ matchedTaskIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] });
    expect(many.matchedTasks).toHaveLength(TASK_CAP);
    expect(decideIntake({ matchedTaskIds: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }, { tasks: [] }).warnings.join(' ')).toMatch(/only the first 6/);
  });

  it('sizes come back as numbers; a date-shaped non-date is blank', () => {
    const out = decide({ currentRingSize: '7 1/2', desiredRingSize: 'size 7', promiseDate: '2026-13-45' });
    expect([out.currentRingSize, out.desiredRingSize, out.promiseDate]).toEqual(['7.5', '7', '']);
    expect(lines(out)).toBe('downx1');
    expect(decide({ promiseDate: '2026-11-20' }).promiseDate).toBe('2026-11-20');
  });

  it('sizing beads are not a sizing job', () => {
    expect(lines(decide({ currentRingSize: '5', desiredRingSize: '6', matchedTasks: [{ id: 'beads', quantity: 1 }] }))).toBe('up3x1 beadsx1');
  });

  it('withSizingStock is per piece', () => {
    const out = withSizingStock({ pieces: 3, currentRingSize: '5', desiredRingSize: '8', matchedTasks: [{ id: 'up3', quantity: 3 }] }, tasks);
    expect(out.materialHints[0].quantity).toBe(6);
  });
});

describe('round 1 sweep, 2026-11-09 — the checks that were missing', () => {
  const white = { metalType: 'gold', karat: '14k', goldColor: 'white', isRing: true };

  it('a count of prongs never multiplies the ticket', () => {
    const out = decide({ ...white, currentRingSize: '5', desiredRingSize: '7', matchedTasks: [{ id: 'retip', quantity: 4 }] }, 'wg retip all 4 prongs size 5 to 7');
    expect(lines(out)).toBe('up3x1 retipx4 rhx1');
    expect(stock(out)).toBe(1);
  });

  it('the sizing task follows the sizes, not the model\'s pick', () => {
    const out = decide({ currentRingSize: '5', desiredRingSize: '7', matchedTasks: [{ id: 'down', quantity: 1 }] });
    expect(lines(out)).toBe('up3x1');
    expect(stock(out)).toBe(1);
    expect(out.warnings.join(' ')).toMatch(/Changed "Size Down" to "Size up/);
    expect(lines(decide({ currentRingSize: '9', desiredRingSize: '6', matchedTasks: [{ id: 'up3', quantity: 1 }] }))).toBe('downx1');
  });

  it('a sizing task is one per piece, never the number of sizes', () => {
    const out = decide({ currentRingSize: '5', desiredRingSize: '7', matchedTasks: [{ id: 'up3', quantity: 2 }] }, 'size up 2 sizes from 5 to 7');
    expect(lines(out)).toBe('up3x1');
    expect(stock(out)).toBe(1);
  });

  it('two sizing tasks on one job: the first is kept, and stock no longer depends on the order', () => {
    const a = decide({ currentRingSize: '6', desiredRingSize: '9', matchedTasks: [{ id: 'upCust', quantity: 1 }, { id: 'up3', quantity: 1 }] });
    expect([lines(a), stock(a)]).toEqual(['upCustx1', 0]);
    const b = decide({ currentRingSize: '6', desiredRingSize: '9', matchedTasks: [{ id: 'up3', quantity: 1 }, { id: 'upCust', quantity: 1 }] });
    expect([lines(b), stock(b)]).toEqual(['up3x1', 2]);
  });

  it('a misread size is blanked, not billed: a karat in a size field', () => {
    const out = decide({ isRing: true, currentRingSize: '6', desiredRingSize: '18', matchedTasks: [{ id: 'up3', quantity: 1 }] });
    expect([out.currentRingSize, out.desiredRingSize, stock(out)]).toEqual(['', '', 0]);
    expect(out.warnings.join(' ')).toMatch(/looks like a misread/);
    expect(MAX_SIZES_MOVED).toBeGreaterThanOrEqual(4); // 8.5 to 12.25 was a real job
  });

  it('not a ring: no ring sizes, no sizing task, no stock', () => {
    const out = decide({ isRing: false, currentRingSize: '7', desiredRingSize: '8', matchedTasks: [{ id: 'weld', quantity: 1 }] }, 'bracelet 7 inch to 8 inch');
    expect([lines(out), out.currentRingSize, stock(out)]).toEqual(['weldx1', '', 0]);
  });

  it('a stated wide shank upgrades a narrow pick; and adds the wide task when none was picked', () => {
    expect(lines(decide({ currentRingSize: '6', desiredRingSize: '7', matchedTasks: [{ id: 'up3', quantity: 1 }] }, 'size up 6 to 7 5mm band'))).toBe('up5x1');
    expect(lines(decide({ currentRingSize: '6', desiredRingSize: '7' }, 'size up 6 to 7 5mm band'))).toBe('up5x1');
    expect(lines(decide({ matchedTasks: [{ id: 'hs3', quantity: 1 }] }, 'half shank, heavy mens band'))).toBe('hs5x1');
  });

  it('different work on each piece: nothing is multiplied, and the jeweler is told', () => {
    expect(describesDifferentWorkPerPiece('2 rings, size one down, retip 4 prongs on the other')).toBe(true);
    const out = decide({ currentRingSize: '7', desiredRingSize: '6', pieceCount: 2, matchedTasks: [{ id: 'down', quantity: 2 }, { id: 'retip', quantity: 4 }] },
      '2 rings, size one down, retip 4 prongs on the other');
    expect(lines(out)).toBe('downx1 retipx4');
    expect(out.warnings.join(' ')).toMatch(/different work on each/);
  });

  it('the metal chosen on the form beats the default: white on the form still gets rhodium', () => {
    const out = decide({ metalType: 'gold', karat: '14k', matchedTasks: [{ id: 'retip', quantity: 2 }] }, '14k retip 2 prongs', { metalType: 'gold', karat: '14k', goldColor: 'white' });
    expect([out.goldColor, lines(out)]).toEqual(['white', 'retipx2 rhx1']);
    // A colour said in the note wins over the form.
    expect(decide({ metalType: 'gold', goldColor: 'yellow', matchedTasks: [{ id: 'retip', quantity: 1 }] }, '', { metalType: 'gold', goldColor: 'white' }).goldColor).toBe('yellow');
    // No metal in the note at all: the form's.
    expect(decide({ matchedTasks: [{ id: 'weld', quantity: 1 }] }, 'laser weld', { metalType: 'silver' })).toMatchObject({ metalType: 'silver', karat: '925', goldColor: '' });
  });

  it('a ruling whose task is missing says so instead of going quiet', () => {
    const noRhodium = tasks.filter((t) => t.id !== 'rh');
    const out = decideIntake({ ...white, matchedTasks: [{ id: 'weld', quantity: 1 }] }, { tasks: noRhodium });
    expect(out.warnings.join(' ')).toMatch(/no single "rhodium plating" task/);
    const noDown = tasks.filter((t) => t.id !== 'down');
    expect(decideIntake({ currentRingSize: '7', desiredRingSize: '6' }, { tasks: noDown }).warnings.join(' ')).toMatch(/no single "size down" task/);
  });

  it('lines the rulings added or changed say why, so the form does not call them "from your sentence"', () => {
    const out = decide({ ...white, currentRingSize: '5', desiredRingSize: '7', matchedTasks: [{ id: 'retip', quantity: 1 }] });
    expect(out.matchedTasks.map((m) => m.ruled || '')).toEqual(['the ring changes size', '', 'white gold']);
  });

  it('a colour the model spelled out is read, never overwritten with yellow', () => {
    for (const said of ['White Gold', 'wg', 'WHITE']) expect(normalizeParsedPayload({ metalType: 'gold', goldColor: said }).goldColor).toBe('white');
    expect([normalizeGoldColor('rose gold'), normalizeGoldColor('yg')]).toEqual(['rose', 'yellow']);
    expect(normalizeParsedPayload({ metalType: 'gold', goldColor: 'two-tone' }).goldColor).toBe('');
    expect(normalizeParsedPayload({ metalType: 'gold', goldColor: '' }).goldColor).toBe('yellow');
    expect(normalizeParsedPayload({ metalType: 'silver' }).goldColor).toBe('');
  });

  it('sizingStockFor is the one formula, shared with the form', () => {
    expect([sizingStockFor({ moved: 1 }), sizingStockFor({ moved: 1.25 }), sizingStockFor({ moved: 2, pieces: 2 }), sizingStockFor({ moved: 3, customerGold: true }), sizingStockFor({ moved: -2 })])
      .toEqual([0, 1, 2, 0, 0]);
  });
});

describe('round 2', () => {
  it('"Size all 3 to a 6": the 3 is a count, so no current size, no sizing guessed, no stock', () => {
    const out = decideIntake({ metalType: 'gold', goldColor: 'white', isRing: true, currentRingSize: '3', desiredRingSize: '6' },
      { tasks, inputText: '14k white gold. Size all 3 to a 6' });
    expect([out.currentRingSize, out.desiredRingSize, out.matchedTasks, out.materialHints]).toEqual(['', '6', [], []]);
    expect(out.warnings.join(' ')).toMatch(/count of pieces, not a size/);
    // A real 3-to-6 is untouched.
    expect(decideIntake({ isRing: true, currentRingSize: '3', desiredRingSize: '6' }, { tasks, inputText: 'size 3 to 6' }).matchedTasks).toHaveLength(1);
  });
});
