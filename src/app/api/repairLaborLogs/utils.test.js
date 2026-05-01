import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/database', () => ({
  db: {
    connect: vi.fn(async () => ({
      collection: vi.fn(() => ({
        findOne: vi.fn(async () => ({ pricing: { wage: 50 } })),
      })),
    })),
  },
}));

vi.mock('@/lib/user/user.query.service.js', () => ({
  UserQueryService: {
    findUserByUserID: vi.fn(async () => null),
    findUserByEmail: vi.fn(async () => null),
  },
}));
import {
  calculateRepairChargeTotal,
  calculateRepairLaborHours,
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

  it('includes custom line item labor hours in repair labor calculations', () => {
    const repair = {
      tasks: [
        { quantity: 2, pricing: { totalLaborHours: 0.25 } },
      ],
      customLineItems: [
        { quantity: 1, laborHours: 0.5 },
        { quantity: 2, laborHours: 0.1 },
      ],
    };

    expect(calculateRepairLaborHours(repair)).toBe(1.2);
  });

  it('computes repair charge total from live work items when stored total is stale', () => {
    const repair = {
      totalCost: 0,
      tasks: [{ price: 24, quantity: 2 }],
      customLineItems: [{ price: 15, quantity: 1 }],
    };

    expect(calculateRepairChargeTotal(repair)).toBe(63);
  });
});
