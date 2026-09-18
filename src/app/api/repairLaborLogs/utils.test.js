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
  stampCompletedTasks,
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

  it('counts labor from tasks only — custom labor is a task; customLineItems are non-labor', () => {
    const repair = {
      tasks: [
        { quantity: 2, pricing: { totalLaborHours: 0.25 } },
        { isCustomLabor: true, quantity: 20, laborHours: 0.2, pricing: { totalLaborHours: 0.2 } },
      ],
      // Legacy custom line items may still carry a stale laborHours from before the split.
      customLineItems: [
        { quantity: 1, laborHours: 0.5, price: 40 },
        { quantity: 2, laborHours: 0.1, price: 5 },
      ],
    };

    expect(calculateRepairLaborHours(repair)).toBe(4.5);
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

  it('credits custom labor lines to whoever stamped them and ignores customLineItems entirely', () => {
    // repair-86f66304 as it SHOULD have been: 10 stone sets + 10 welds by A, 10 welds by B.
    const repair = {
      tasks: [
        { title: 'Set stone', laborHours: 0.2, quantity: 10, completedByUserID: 'u-a', completedByName: 'A', laborRateSnapshot: 50 },
        { title: 'Laser weld', isCustomLabor: true, laborHours: 0.2, quantity: 10, completedByUserID: 'u-a', completedByName: 'A', laborRateSnapshot: 50 },
        { title: 'Laser weld', isCustomLabor: true, laborHours: 0.2, quantity: 10, completedByUserID: 'u-b', completedByName: 'B', laborRateSnapshot: 50 },
      ],
      customLineItems: [{ description: 'Replacement clasp (part)', laborHours: 0.5, quantity: 2, price: 30 }],
    };
    const groups = groupCompletedTasksByJeweler(repair);
    expect(groups.find((g) => g.userID === 'u-a').hours).toBeCloseTo(4.0, 2);
    expect(groups.find((g) => g.userID === 'u-b').hours).toBeCloseTo(2.0, 2);
    expect(groups.reduce((s, g) => s + g.hours, 0)).toBeCloseTo(6.0, 2);
  });

  describe('stampCompletedTasks (sign-off with quantity splits)', () => {
    const stamp = { completedByUserID: 'u-a', completedByName: 'A', completedAt: 'now', laborRateSnapshot: 50 };

    it('stamps whole tasks in place and leaves the rest alone', () => {
      const tasks = [{ id: 1, laborHours: 0.5 }, { id: 2, laborHours: 0.3 }];
      const { tasks: out, stampedCount } = stampCompletedTasks({ tasks, completed: [1], stamp });
      expect(stampedCount).toBe(1);
      expect(out).toHaveLength(2);
      expect(out[0]).toEqual(tasks[0]);
      expect(out[1]).toMatchObject({ id: 2, completedByUserID: 'u-a', laborRateSnapshot: 50 });
    });

    it('splits a partial quantity into a stamped portion + un-stamped remainder', () => {
      const tasks = [{ id: 7, title: 'Laser weld', isCustomLabor: true, laborHours: 0.2, quantity: 20, price: 15 }];
      const { tasks: out } = stampCompletedTasks({ tasks, completed: [{ index: 0, quantity: 10 }], stamp });
      expect(out).toHaveLength(2);
      expect(out[0]).toMatchObject({ id: 7, quantity: 10, price: 15, laborHours: 0.2, completedByUserID: 'u-a' });
      expect(out[1]).toMatchObject({ title: 'Laser weld', quantity: 10, price: 15, laborHours: 0.2, isCustomLabor: true });
      expect(out[1].completedByUserID).toBeUndefined();
      expect(out[1].id).not.toBe(7);
      // Invariant: ticket total and hours are unchanged by the split.
      const total = (arr) => arr.reduce((s, t) => s + t.price * t.quantity, 0);
      expect(total(out)).toBe(total(tasks));
      expect(calculateRepairLaborHours({ tasks: out })).toBe(calculateRepairLaborHours({ tasks }));
      // The remainder is what the next jeweler signs off.
      expect(getUncreditedTaskIndexes({ tasks: out })).toEqual([1]);
    });

    it('treats a quantity ≥ the task quantity (or missing) as the whole task; skips stamped/out-of-range', () => {
      const tasks = [{ id: 1, quantity: 3 }, { id: 2, quantity: 2, completedByUserID: 'u-z' }];
      const { tasks: out, stampedCount } = stampCompletedTasks({
        tasks, completed: [{ index: 0, quantity: 99 }, { index: 1, quantity: 1 }, { index: 5 }], stamp,
      });
      expect(stampedCount).toBe(1);
      expect(out).toHaveLength(2);
      expect(out[0]).toMatchObject({ id: 1, quantity: 3, completedByUserID: 'u-a' });
      expect(out[1].completedByUserID).toBe('u-z');
    });
  });

  it('returns nothing when no tasks are stamped (caller applies the whole-repair fallback)', () => {
    expect(groupCompletedTasksByJeweler({ tasks: [{ laborHours: 1 }] })).toEqual([]);
  });
});
