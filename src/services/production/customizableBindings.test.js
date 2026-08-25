import { describe, it, expect } from 'vitest';
import {
  customizableSlots, hasBinding, slotSpec, bindingFor, unboundSlots,
  resolveSelectionBindings, annotateBindings, mergeBaseMeshMap,
} from '@/services/production/customizableBindings';

// refrakt-native meshMap: `customizable` lives ON the slot, id = nameContains.
const meshMap = [
  { nameContains: 'Band', type: 'metal', finish: 'polished', customizable: {
    label: 'Band metal', default: 'polished',
    options: [
      { finish: 'polished', binding: { metalKey: 'GOLD_18K_WHITE' } },
      { finish: 'yellow', binding: { metalKey: 'GOLD_18K_YELLOW' } },
      { finish: 'satin' }, // unbound
    ],
  } },
  { nameContains: 'Center', type: 'gem', gemPreset: 'diamond', customizable: {
    label: 'Center stone', default: 'diamond',
    options: [
      { gemPreset: 'diamond', binding: { gemstoneId: 'gem_dia_1ct' } },
      { gemPreset: 'sapphire', binding: { materialRef: 'mat_sapph', carat: 1.2 } },
    ],
  } },
  { nameContains: 'Prongs', type: 'metal', finish: 'polished' }, // FIXED (no customizable)
];

describe('customizableSlots', () => {
  it('extracts only customizable slots, keyed by nameContains', () => {
    const out = customizableSlots(meshMap);
    expect(out.map((s) => s.nameContains)).toEqual(['Band', 'Center']); // Prongs is fixed
    expect(out[0].options).toHaveLength(3);
    expect(out[1].type).toBe('gem');
  });
});

describe('hasBinding', () => {
  it('metal needs metalKey; gem needs gemstoneId or materialRef+carat', () => {
    expect(hasBinding('metal', { binding: { metalKey: 'X' } })).toBe(true);
    expect(hasBinding('metal', { binding: {} })).toBe(false);
    expect(hasBinding('gem', { binding: { gemstoneId: 'g' } })).toBe(true);
    expect(hasBinding('gem', { binding: { materialRef: 'm', carat: 1 } })).toBe(true);
    expect(hasBinding('gem', { binding: { materialRef: 'm' } })).toBe(false);
  });
});

describe('bindingFor', () => {
  it('returns the chosen option binding, or null (unbound / fixed)', () => {
    expect(bindingFor(meshMap, 'Band', 'polished')).toEqual({ metalKey: 'GOLD_18K_WHITE' });
    expect(bindingFor(meshMap, 'Center', 'sapphire')).toEqual({ materialRef: 'mat_sapph', carat: 1.2 });
    expect(bindingFor(meshMap, 'Band', 'satin')).toBeNull();   // authored but unbound
    expect(bindingFor(meshMap, 'Prongs', 'polished')).toBeNull(); // fixed slot
  });
});

describe('unboundSlots', () => {
  it('flags customizable slots with any unbound option', () => {
    expect(unboundSlots(meshMap)).toEqual(['Band']); // 'satin' unbound; Center fully bound
  });
});

describe('resolveSelectionBindings (0005 §6 join by nameContains)', () => {
  it('resolves chosen options to bindings; collects unbound', () => {
    const resolved = [
      { nameContains: 'Band', type: 'metal', finish: 'yellow' },       // customizable, bound
      { nameContains: 'Center', type: 'gem', gemPreset: 'diamond' },   // customizable, bound
      { nameContains: 'Prongs', type: 'metal', finish: 'polished' },   // fixed → ignored
    ];
    const r = resolveSelectionBindings(meshMap, resolved);
    expect(r.metalKeyByFinish).toEqual({ yellow: 'GOLD_18K_YELLOW' });
    expect(r.gemBindingByPreset).toEqual({ diamond: { gemstoneId: 'gem_dia_1ct' } });
    expect(r.unbound).toEqual([]);
  });

  it('reports an unbound customizable slot (→ endpoint 422)', () => {
    const resolved = [{ nameContains: 'Band', type: 'metal', finish: 'satin' }];
    expect(resolveSelectionBindings(meshMap, resolved).unbound).toEqual(['Band']);
  });
});

describe('mergeBaseMeshMap (M3-T1 non-destructive re-tag; #169/#170)', () => {
  const prior = [
    { nameContains: 'mounting', type: 'metal', finish: 'yellow', volumeCm3: 0.486,
      customizable: { label: 'Band metal', default: 'yellow', options: [{ finish: 'yellow', binding: { metalKey: 'GOLD_18K_YELLOW' } }] } },
    { nameContains: 'amethyst', type: 'gem', gemPreset: 'amethyst',
      customizable: { label: 'Center', default: 'diamond', options: [{ gemPreset: 'diamond', binding: { gemstoneId: 'g1' } }] } },
  ];

  it('preserves BOTH customizable AND volumeCm3 while taking base material fields from Studio', () => {
    // Studio re-tag output: new base finish on mounting, NO customizable/volumeCm3 (absent from Studio).
    const base = [
      { nameContains: 'mounting', type: 'metal', finish: 'white' },   // re-tagged white
      { nameContains: 'amethyst', type: 'gem', gemPreset: 'sapphire' },
    ];
    const merged = mergeBaseMeshMap(base, prior);
    expect(merged[0].finish).toBe('white');                 // base field updated
    expect(merged[0].volumeCm3).toBe(0.486);                // volumeCm3 preserved (else metal → $0)
    expect(merged[0].customizable).toEqual(prior[0].customizable); // customizable preserved
    expect(merged[1].gemPreset).toBe('sapphire');
    expect(merged[1].customizable).toEqual(prior[1].customizable);
  });

  it('passes through a new slot with no prior match, and does not mutate inputs', () => {
    const base = [{ nameContains: 'halo', type: 'metal', finish: 'yellow' }];
    const merged = mergeBaseMeshMap(base, prior);
    expect(merged[0]).toEqual({ nameContains: 'halo', type: 'metal', finish: 'yellow' }); // no customizable/volumeCm3 invented
    expect(prior[0].volumeCm3).toBe(0.486); // inputs untouched
  });

  it('tolerates empty/non-array inputs', () => {
    expect(mergeBaseMeshMap([], prior)).toEqual([]);
    expect(mergeBaseMeshMap(undefined, undefined)).toEqual([]);
  });
});

describe('annotateBindings', () => {
  it('merges admin bindings onto customizable options, no mutation of fixed slots', () => {
    const base = [
      { nameContains: 'Band', type: 'metal', customizable: { options: [{ finish: 'polished' }, { finish: 'yellow' }] } },
      { nameContains: 'Prongs', type: 'metal', finish: 'polished' },
    ];
    const out = annotateBindings(base, { Band: { polished: { metalKey: 'GOLD_18K_WHITE' } } });
    expect(out[0].customizable.options[0]).toEqual({ finish: 'polished', binding: { metalKey: 'GOLD_18K_WHITE' } });
    expect(out[0].customizable.options[1]).toEqual({ finish: 'yellow' }); // untouched
    expect(out[1]).toBe(base[1]); // fixed slot returned as-is
  });
});
