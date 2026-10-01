import { describe, it, expect } from 'vitest';
import { suggestionLines, missRanking, formatWhen } from './intakeLogFormat';

describe('suggestionLines', () => {
  it('lists what the AI filled for a sentence, skipping blanks', () => {
    expect(suggestionLines({
      kind: 'text',
      output: { metalType: 'gold', karat: '', isRing: true, tasks: [{ id: 't1', title: 'Retip', quantity: 3 }, { id: 't2' }] },
    })).toEqual([
      { field: 'metalType', value: 'gold' },
      { field: 'isRing', value: 'Yes' },
      { field: 'tasks', value: 'Retip ×3, t2' },
    ]);
  });

  it('shows the description for a photo', () => {
    expect(suggestionLines({ kind: 'photo', output: { description: 'A ring.' } })).toEqual([{ field: 'description', value: 'A ring.' }]);
    expect(suggestionLines({ kind: 'photo', output: {} })).toEqual([]);
  });
});

describe('missRanking', () => {
  it('orders the most-missed field first, labelled', () => {
    expect(missRanking({ karat: 1, tasks: 4, promiseDate: 1 })).toEqual([
      { field: 'tasks', label: 'Tasks', count: 4 },
      { field: 'karat', label: 'Karat', count: 1 },
      { field: 'promiseDate', label: 'Promise date', count: 1 },
    ]);
  });
});

describe('formatWhen', () => {
  it('is blank for a missing or bad date', () => {
    expect(formatWhen(null)).toBe('');
    expect(formatWhen('nope')).toBe('');
    expect(formatWhen('2026-10-01T15:00:00Z')).not.toBe('');
  });
});
