import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * INCIDENT on CO-msp2z3jx-b313c5 (Seth Adams). A CAD designer was assigned twice by accident, one
 * assignment was deleted, and the work order it had spawned stayed on the bench with nothing behind it.
 *
 * Assigning a CAD designer does THREE things — spawns a CAD work order, snapshots the design fee into
 * the quote, and adds a "CAD QC Review" labor line. Removing the assignment reversed NONE of them, and
 * the second assignment had also overwritten designFee on its way in. Net result: an orphan work order,
 * and an order billing $0 for a designer who was still assigned at $100.
 */

let order;
const updates = [];
const spawned = [];
let workOrders;
const deleted = [];
const woUpdates = [];

vi.mock('@/lib/database', () => ({
  db: {
    connect: vi.fn(async () => ({
      collection: (name) => ({
        findOne: async () => (name === 'users'
          ? { userID: 'user-cad', firstName: 'Jacob', lastName: 'Engel', artisanApplication: { customDesignFee: 100 } }
          : null),
        deleteOne: async (f) => { deleted.push(f.workOrderID); return { deletedCount: 1 }; },
        updateOne: async () => ({ modifiedCount: 1 }),
      }),
    })),
  },
}));
vi.mock('@/app/api/custom-orders/model', () => ({
  default: {
    findById: vi.fn(async () => order),
    addAssignment: vi.fn(async (_id, a) => { order = { ...order, assignments: [...(order.assignments || []), a] }; return a; }),
    removeAssignment: vi.fn(async (_id, aid) => {
      order = { ...order, assignments: (order.assignments || []).filter((a) => a.id !== aid) };
      return order;
    }),
    updateById: vi.fn(async (_id, fields) => { updates.push(fields); order = { ...order, ...fields }; return order; }),
  },
}));
vi.mock('@/services/customs/customProduction', () => ({
  spawnCustomWorkOrder: vi.fn(async (args) => { spawned.push(args); return { workOrderID: 'wo-new' }; }),
}));
vi.mock('@/services/customs/customTasks', () => ({
  getCustomTaskLine: vi.fn(async () => ({ description: 'CAD QC Review', cost: 25, autoKey: 'custom-qc', source: 'auto' })),
  mergeAutoLaborLine: vi.fn((existing, line) => [...(existing || []), line]),
}));
vi.mock('@/services/workOrders/disciplines', () => ({ DISCIPLINE: { CAD: 'cad', BENCH_JEWELRY: 'bench_jewelry' } }));
vi.mock('@/app/api/admin/settings/services/settingsManager.service', () => ({ default: { getSettings: async () => ({}) } }));
vi.mock('@/app/api/workOrders/model', () => ({
  default: {
    findBySource: vi.fn(async () => workOrders),
    updateByID: vi.fn(async (id, f) => { woUpdates.push({ id, ...f }); return { workOrderID: id, ...f }; }),
  },
  WORK_ORDER_SOURCE: { PRODUCTION_PIECE: 'production_piece' },
}));
vi.mock('@/app/api/pieces/model', () => ({ default: {} }));

const load = () => import('@/services/customs/customAssignment');

beforeEach(() => {
  updates.length = 0; spawned.length = 0; deleted.length = 0; woUpdates.length = 0;
  workOrders = [];
  order = {
    customID: 'CO-x', pieceIDs: ['piece-1'], assignments: [],
    quote: { laborTasks: [], designFee: 0 },
  };
  vi.clearAllMocks();
  vi.resetModules();
});

describe('assigning a CAD designer', () => {
  it('stamps the assignment on the work order so the two can be paired later', async () => {
    const { assignArtisan } = await load();
    await assignArtisan({ customID: 'CO-x', userID: 'user-cad', role: 'cad' });
    expect(spawned).toHaveLength(1);
    expect(spawned[0].assignmentId).toBe(order.assignments[0].id);
  });

  it('REFUSES a second CAD designer — the root cause of the orphaned work order', async () => {
    const { assignArtisan } = await load();
    await assignArtisan({ customID: 'CO-x', userID: 'user-cad', role: 'cad' });
    await expect(assignArtisan({ customID: 'CO-x', userID: 'user-cad', role: 'cad' }))
      .rejects.toThrow(/already assigned to CAD/);
  });

  it('does not spawn a second work order when the second assignment is refused', async () => {
    const { assignArtisan } = await load();
    await assignArtisan({ customID: 'CO-x', userID: 'user-cad', role: 'cad' });
    await assignArtisan({ customID: 'CO-x', userID: 'user-cad', role: 'cad' }).catch(() => {});
    expect(spawned).toHaveLength(1);           // not two
    expect(order.assignments).toHaveLength(1);
  });

  it('a bench assignment is unaffected by the CAD guard', async () => {
    const { assignArtisan } = await load();
    await assignArtisan({ customID: 'CO-x', userID: 'user-cad', role: 'cad' });
    await expect(assignArtisan({ customID: 'CO-x', userID: 'user-cad', role: 'bench' })).resolves.toBeTruthy();
  });
});

describe('removing a CAD assignment reverses what assigning did', () => {
  const withAssignment = () => {
    const a = { id: 'asg-1', userID: 'user-cad', name: 'Jacob Engel', role: 'cad', feeSnapshot: 100 };
    order = {
      ...order,
      assignments: [a],
      quote: {
        designFee: 100,
        includeCustomDesign: true,
        laborTasks: [
          { description: 'CAD QC Review', autoKey: 'custom-qc', cost: 25 },
          { description: 'set center', cost: 40 },
        ],
      },
    };
    return a;
  };

  it('deletes an untouched work order — it should never have existed', async () => {
    withAssignment();
    workOrders = [{ workOrderID: 'wo-1', assignmentId: 'asg-1', discipline: 'cad', cadStage: 'design', files: {}, tasks: [] }];
    const { removeAssignment } = await load();
    await removeAssignment({ customID: 'CO-x', assignmentID: 'asg-1' });
    expect(deleted).toEqual(['wo-1']);
  });

  it('CANCELS rather than deletes a work order that already carries work', async () => {
    // The assignment was a mistake; the work was not. Destroying it would lose the labor record.
    withAssignment();
    workOrders = [{
      workOrderID: 'wo-1', assignmentId: 'asg-1', discipline: 'cad', cadStage: 'design',
      files: { stl: { url: 'x' } }, tasks: [],
    }];
    const { removeAssignment } = await load();
    await removeAssignment({ customID: 'CO-x', assignmentID: 'asg-1' });
    expect(deleted).toEqual([]);
    expect(woUpdates[0]).toMatchObject({ id: 'wo-1', status: 'CANCELLED' });
  });

  it('clears the design fee so the order stops billing an unassigned designer', async () => {
    withAssignment();
    workOrders = [{ workOrderID: 'wo-1', assignmentId: 'asg-1', files: {}, tasks: [] }];
    const { removeAssignment } = await load();
    await removeAssignment({ customID: 'CO-x', assignmentID: 'asg-1' });
    expect(updates.at(-1).quote.designFee).toBe(0);
    expect(updates.at(-1).quote.includeCustomDesign).toBe(false);
  });

  it('drops the auto CAD QC line but keeps real labor lines', async () => {
    withAssignment();
    workOrders = [{ workOrderID: 'wo-1', assignmentId: 'asg-1', files: {}, tasks: [] }];
    const { removeAssignment } = await load();
    await removeAssignment({ customID: 'CO-x', assignmentID: 'asg-1' });
    expect(updates.at(-1).quote.laborTasks.map((t) => t.description)).toEqual(['set center']);
  });

  it('finds a PRE-EXISTING work order with no assignmentId — the orphans that caused this', async () => {
    // Work orders created before the stamp existed have no link; falling back to the CAD design stage
    // for the same user is what lets this fix clean up the very orders that prompted it.
    withAssignment();
    workOrders = [{
      workOrderID: 'wo-old', discipline: 'cad', cadStage: 'design',
      assignedToUserID: 'user-cad', files: {}, tasks: [],
    }];
    const { removeAssignment } = await load();
    await removeAssignment({ customID: 'CO-x', assignmentID: 'asg-1' });
    expect(deleted).toEqual(['wo-old']);
  });

  it('removing a BENCH assignment leaves the quote and work orders alone', async () => {
    order = {
      ...order,
      assignments: [{ id: 'asg-b', role: 'bench', userID: 'u' }],
      quote: { designFee: 100, laborTasks: [] },
    };
    const { removeAssignment } = await load();
    await removeAssignment({ customID: 'CO-x', assignmentID: 'asg-b' });
    expect(updates).toHaveLength(0);
    expect(deleted).toEqual([]);
  });

  it('still removes the assignment when work-order cleanup fails', async () => {
    // A stuck work order is visible and fixable; an assignment you cannot remove is not.
    withAssignment();
    const { default: WorkOrdersModel } = await import('@/app/api/workOrders/model');
    WorkOrdersModel.findBySource.mockRejectedValueOnce(new Error('mongo down'));
    const { removeAssignment } = await load();
    await expect(removeAssignment({ customID: 'CO-x', assignmentID: 'asg-1' })).resolves.toBeTruthy();
  });
});
