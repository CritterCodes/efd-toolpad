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
  getUncreditedTaskIndexes,
  sumTaskLaborHours,
  groupCompletedTasksByJeweler,
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

describe('bench handoff per-task labor (sign-off stamps)', () => {
  it('getUncreditedTaskIndexes returns only un-stamped tasks', () => {
    const repair = { tasks: [
      { name: 'Size', laborHours: 0.8, completedByUserID: 'u-v' },
      { name: 'Set stone', laborHours: 0.4 },
    ] };
    expect(getUncreditedTaskIndexes(repair)).toEqual([1]);
    expect(getUncreditedTaskIndexes({ tasks: [{ laborHours: 1 }, { laborHours: 2 }] })).toEqual([0, 1]);
  });

  it('sumTaskLaborHours sums the given indexes (quantity + pricing.totalLaborHours aware)', () => {
    const repair = { tasks: [
      { laborHours: 0.8 },
      { pricing: { totalLaborHours: 0.5 }, quantity: 2 },
    ] };
    expect(sumTaskLaborHours(repair, [0])).toBe(0.8);
    expect(sumTaskLaborHours(repair, [0, 1])).toBe(1.8);
  });

  it('groups stamped tasks by jeweler, preserving the per-jeweler rate snapshot', () => {
    const repair = { tasks: [
      { laborHours: 0.8, completedByUserID: 'u-v', completedByName: 'Vernon', laborRateSnapshot: 50 },
      { laborHours: 0.4, completedByUserID: 'u-o', completedByName: 'Owner', laborRateSnapshot: 80 },
      { laborHours: 0.2, completedByUserID: 'u-v', completedByName: 'Vernon', laborRateSnapshot: 50 },
    ] };
    const groups = groupCompletedTasksByJeweler(repair);
    expect(groups.find((g) => g.userID === 'u-v')).toMatchObject({ hours: 1.0, rate: 50, name: 'Vernon' });
    expect(groups.find((g) => g.userID === 'u-o')).toMatchObject({ hours: 0.4, rate: 80 });
    // Invariant: per-jeweler hours sum to the total task hours (each task paid once).
    expect(groups.reduce((s, g) => s + g.hours, 0)).toBeCloseTo(1.4, 2);
  });

  it('folds customLineItem hours into the final mover bucket', () => {
    const repair = {
      tasks: [
        { laborHours: 1, completedByUserID: 'u-a', completedByName: 'A', laborRateSnapshot: 50 },
        { laborHours: 1, completedByUserID: 'u-b', completedByName: 'B', laborRateSnapshot: 60 },
      ],
      customLineItems: [{ laborHours: 0.5, quantity: 2 }],
    };
    const groups = groupCompletedTasksByJeweler(repair, { finalMoverUserID: 'u-b' });
    expect(groups.find((g) => g.userID === 'u-b').hours).toBeCloseTo(2.0, 2);
    expect(groups.find((g) => g.userID === 'u-a').hours).toBeCloseTo(1.0, 2);
  });

  it('returns nothing when no tasks are stamped (caller applies the whole-repair fallback)', () => {
    expect(groupCompletedTasksByJeweler({ tasks: [{ laborHours: 1 }] })).toEqual([]);
  });
});
