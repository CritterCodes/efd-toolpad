import { describe, expect, it } from 'vitest';
import {
  appendLaborReviewSystemNote,
  hasLaborRelevantRepairChanges,
} from './utils';

describe('repair labor log utils', () => {
  it('detects labor-relevant repair changes', () => {
    const existingRepair = {
      customLineItems: [{ description: 'old item', price: 70 }],
      totalCost: 70,
    };

    expect(hasLaborRelevantRepairChanges({
      customLineItems: [{ description: 'new item', price: 15 }],
    }, existingRepair)).toBe(true);

    expect(hasLaborRelevantRepairChanges({
      clientName: 'Sheila',
    }, existingRepair)).toBe(false);
  });

  it('appends the system review note only once', () => {
    const withNote = appendLaborReviewSystemNote('Existing note');

    expect(withNote).toContain('Existing note');
    expect(withNote).toContain('System flag: repair pricing or work items changed after the labor snapshot.');
    expect(appendLaborReviewSystemNote(withNote)).toBe(withNote);
  });
});
