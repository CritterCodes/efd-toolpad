import { describe, it, expect, vi } from 'vitest';

/**
 * Smart intake's deterministic edges — the parts that decide what reaches the
 * form regardless of what the model says. The karat normalizer exists because
 * Gemini answers in free text ("14K") while the form's Select speaks '14k':
 * an unmatched value rendered the Select silently BLANK, which is how a 14k
 * price gets charged on an 18k ring.
 */

vi.mock('@/lib/auth', () => ({ auth: vi.fn() }));

const { normalizeKaratValue, normalizeParsedPayload, prefilterTasks, tasksForPrompt, buildIntakePrompt, FULL_CATALOG_LIMIT, withRhodiumForWhiteGold, withSizingTaskForSizes, withDefaultShankWidth, statesWideShank } = await import('./route.js');

describe('normalizeKaratValue', () => {
  it('maps every casing and suffix Gemini produces onto the form vocabulary', () => {
    expect(normalizeKaratValue('14K')).toBe('14k');
    expect(normalizeKaratValue('14k')).toBe('14k');
    expect(normalizeKaratValue('14 kt')).toBe('14k');
    expect(normalizeKaratValue('18KT')).toBe('18k');
    expect(normalizeKaratValue('14')).toBe('14k');
  });

  it('keeps purity numbers as-is (silver and platinum)', () => {
    expect(normalizeKaratValue('925')).toBe('925');
    expect(normalizeKaratValue('950')).toBe('950');
    expect(normalizeKaratValue('999')).toBe('999');
  });

  it('returns EMPTY for anything the Select cannot render, never a guess', () => {
    expect(normalizeKaratValue('fourteen karat')).toBe('');
    expect(normalizeKaratValue('solid gold')).toBe('');
    expect(normalizeKaratValue('')).toBe('');
  });
});

describe('normalizeParsedPayload', () => {
  it('caps matched tasks at 3 — the same number the prompt promises', () => {
    const out = normalizeParsedPayload({ matchedTaskIds: ['a', 'b', 'c', 'd', 'e'] });
    expect(out.matchedTaskIds).toEqual(['a', 'b', 'c']);
  });

  it('normalizes the karat it passes to the form', () => {
    expect(normalizeParsedPayload({ karat: '14K' }).karat).toBe('14k');
  });
});

describe('prefilterTasks', () => {
  const tasks = [
    { id: '1', title: 'Size Down', symptoms: ['ring too big'] },
    { id: '2', title: 'Clasp Repair', symptoms: ['broken clasp'] },
    { id: '3', title: 'Half-Shank — Platinum, up to 3mm (laser welded)', symptoms: [] },
  ];

  it('3-character words carry signal in this domain (14k, pin, cut)', () => {
    // "fix 14k ring" — under the old >3 filter, '14k' and 'fix' both dropped.
    const out = prefilterTasks('big ring', tasks);
    expect(out.map((t) => t.id)).toContain('1');
  });

  it('platinum input surfaces the platinum task', () => {
    const out = prefilterTasks('platinum band half shank', tasks);
    expect(out[0].id).toBe('3');
  });
});

describe('tasksForPrompt — the model sees the whole catalog while it is small enough to send', () => {
  const catalog = [
    { id: 'down', title: 'Size Down', symptoms: ['ring too big'] },
    { id: 'weld', title: 'Laser Weld', symptoms: ['broken link'] },
    { id: 'retip', title: 'Retip prongs', symptoms: ['worn prong'] },
  ];

  it('sends every task for the inputs the keyword prefilter used to strip (logged 2026-10/11)', () => {
    // "from 11.5 to 9" shares no word with "Size Down"; "laser-welded" is not "laser weld"; "tips" is not in "retip".
    for (const text of ['14k yellow gold band, from 11.5 to 9', '14k paperclip bracelet, laser-welded', 'two tips']) {
      expect(tasksForPrompt(text, catalog).map((t) => t.id)).toEqual(['down', 'weld', 'retip']);
    }
  });

  it('falls back to the prefilter only for a catalog too big to send', () => {
    const big = Array.from({ length: FULL_CATALOG_LIMIT + 1 }, (_, i) => ({ id: String(i), title: `Task ${i}`, symptoms: [] }));
    expect(tasksForPrompt('size', big).length).toBeLessThan(big.length);
  });
});

describe('buildIntakePrompt', () => {
  const prompt = buildIntakePrompt({
    inputText: '14k white gold. Size all 3 to a 6',
    tasks: [{ id: 'down', title: 'Size Down' }, { id: 'weld', title: 'Laser Weld' }],
    todayIso: '2026-11-09',
  });

  it('lists every task and the input', () => {
    expect(prompt).toContain('id:down');
    expect(prompt).toContain('id:weld');
    expect(prompt).toContain('Input text: 14k white gold. Size all 3 to a 6');
  });

  it('carries the rules the logged misses called for', () => {
    expect(prompt).toMatch(/SEVERAL PIECES/);        // "size all 3 to a 6" was read as size 3 -> 6
    expect(prompt).toMatch(/SIZE WITH NO WORD "SIZE"/); // "7.25 needs to be 6.75" got no sizing task
    expect(prompt).toMatch(/SHANK WIDTH/);           // a 3-5mm sizing task picked with no width stated
  });
});

describe('owner rulings, 2026-11-09', () => {
  it('gold with no colour said is yellow; other metals get no colour', () => {
    expect(normalizeParsedPayload({ metalType: 'gold', karat: '14k' }).goldColor).toBe('yellow');
    expect(normalizeParsedPayload({ metalType: 'gold', goldColor: 'white' }).goldColor).toBe('white');
    expect(normalizeParsedPayload({ metalType: 'silver' }).goldColor).toBe('');
  });

  it('sizing stock is whole sizes, rounded up — never a quarter of a piece', () => {
    const hints = normalizeParsedPayload({ materialHints: [{ type: 'sizing_material', quantity: 0.25 }, { type: 'solder', quantity: 0.5 }] }).materialHints;
    expect(hints).toEqual([
      { type: 'sizing_material', quantity: 1, reason: '' },
      { type: 'solder', quantity: 0.5, reason: '' },
    ]);
  });

  describe('every white gold job gets rhodium', () => {
    const tasks = [{ id: 'down', title: 'Size Down' }, { id: 'rh', title: 'Rhodium Plating' }];
    const white = (matchedTasks) => ({ metalType: 'gold', goldColor: 'white', matchedTasks, matchedTaskIds: matchedTasks.map((m) => m.id) });

    it('adds it when the model left it off, carrying the piece count', () => {
      expect(withRhodiumForWhiteGold(white([{ id: 'down', quantity: 1 }]), tasks).matchedTasks)
        .toEqual([{ id: 'down', quantity: 1 }, { id: 'rh', quantity: 1 }]);
      expect(withRhodiumForWhiteGold(white([{ id: 'down', quantity: 2 }]), tasks).matchedTasks.at(-1))
        .toEqual({ id: 'rh', quantity: 2 });
    });

    it('leaves alone: already there, yellow gold, no matched job, no rhodium task in the catalog', () => {
      const has = white([{ id: 'down', quantity: 1 }, { id: 'rh', quantity: 1 }]);
      expect(withRhodiumForWhiteGold(has, tasks)).toBe(has);
      const yellow = { ...white([{ id: 'down', quantity: 1 }]), goldColor: 'yellow' };
      expect(withRhodiumForWhiteGold(yellow, tasks)).toBe(yellow);
      expect(withRhodiumForWhiteGold(white([]), tasks).matchedTasks).toEqual([]);
      expect(withRhodiumForWhiteGold(white([{ id: 'down', quantity: 1 }]), [tasks[0]]).matchedTasks).toHaveLength(1);
    });
  });
});

describe('the sizing task is decided, not hoped for (owner, 2026-11-09)', () => {
  // The live titles, 2026-11-09.
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
  ];
  const parsed = (over) => ({ metalType: 'gold', goldColor: 'white', currentRingSize: '5', desiredRingSize: '7', matchedTasks: [], matchedTaskIds: [], ...over });

  it('"going up two sizes from 5 to a 7" with no task matched gets the 3x2 size up, and then rhodium', () => {
    const sized = withSizingTaskForSizes(parsed(), tasks);
    expect(sized.matchedTasks).toEqual([{ id: 'up3', quantity: 1 }]);
    expect(withRhodiumForWhiteGold(sized, tasks).matchedTaskIds).toEqual(['up3', 'rh']);
  });

  it('a size down gets Size Down; sizing beads do not count as the sizing job', () => {
    expect(withSizingTaskForSizes(parsed({ currentRingSize: '7.25', desiredRingSize: '6.75' }), tasks).matchedTaskIds).toEqual(['down']);
    expect(withSizingTaskForSizes(parsed({ matchedTasks: [{ id: 'beads', quantity: 1 }] }), tasks).matchedTaskIds).toEqual(['up3', 'beads']);
  });

  it('leaves alone: a sizing task already matched (customer gold included), or no size change', () => {
    const cust = parsed({ matchedTasks: [{ id: 'upCust', quantity: 1 }] });
    expect(withSizingTaskForSizes(cust, tasks)).toBe(cust);
    const none = parsed({ currentRingSize: '', desiredRingSize: '' });
    expect(withSizingTaskForSizes(none, tasks)).toBe(none);
    const same = parsed({ currentRingSize: '8', desiredRingSize: '8' });
    expect(withSizingTaskForSizes(same, tasks)).toBe(same);
  });

  it('a ring is 3x2 unless a wide shank is stated', () => {
    const wide = parsed({ matchedTasks: [{ id: 'up5', quantity: 1 }, { id: 'hs5', quantity: 3 }] });
    expect(withDefaultShankWidth(wide, tasks, '10k white gold, size 6 to 7.5').matchedTasks)
      .toEqual([{ id: 'up3', quantity: 1 }, { id: 'hs3', quantity: 3 }]);
    expect(withDefaultShankWidth(wide, tasks, '14k yellow gold, 5 mm band, size up 2 sizes')).toBe(wide);
    expect(withDefaultShankWidth(wide, tasks, 'wide band size up')).toBe(wide);
  });

  it('statesWideShank: a width over 3mm or the word for it; "3x2 mm" and "2 mm" are not wide', () => {
    expect(statesWideShank('3.5 mm band')).toBe(true);
    expect(statesWideShank('chunky ring')).toBe(true);
    expect(statesWideShank('3x2 mm shank')).toBe(false);
    expect(statesWideShank('size 5 to 7')).toBe(false);
  });
});
