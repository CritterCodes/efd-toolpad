import { describe, expect, it, vi } from 'vitest';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import DesignsModel from '@/app/api/designs/model';
import PiecesModel from '@/app/api/pieces/model';
import { buildProductFromPiece } from '@/services/products/productContract';
import { planQuoteLaborHours, applyQuoteHoursToWorkOrders, reconcileQuoteToWorkOrders, customPieceInput, ensureCustomPiece } from '@/services/customs/customProduction';

describe('custom piece spawn gemstone thread', () => {
  it('copies the linked Design gemstoneId into the spawned Piece', () => {
    expect(customPieceInput(
      { clientID: 'client-1', metalType: 'gold' },
      { designID: 'design-1', gemstoneId: 'gem-1' },
      'custom-1',
    )).toEqual(expect.objectContaining({
      designID: 'design-1',
      gemstoneId: 'gem-1',
      customOrderID: 'custom-1',
    }));
  });

  it('preserves legacy behavior for an unlinked Design', () => {
    expect(customPieceInput({}, { designID: 'design-2' }, 'custom-2').gemstoneId).toBeNull();
  });

  it('threads a linked gemstone through the real custom spawn into the product contract', async () => {
    const order = { customID: 'custom-1', clientID: 'client-1', designIDs: ['design-1'], pieceIDs: [] };
    const design = { designID: 'design-1', gemstoneId: 'gem-1' };
    const findOrder = vi.spyOn(CustomOrdersModel, 'findById').mockResolvedValue(order);
    const findDesign = vi.spyOn(DesignsModel, 'findById').mockResolvedValue(design);
    const createPiece = vi.spyOn(PiecesModel, 'create').mockResolvedValue({ pieceID: 'piece-1' });
    const linkProduction = vi.spyOn(CustomOrdersModel, 'linkProduction').mockResolvedValue({ ...order, pieceIDs: ['piece-1'] });

    try {
      await ensureCustomPiece('custom-1');
      const spawnedPiece = { ...createPiece.mock.calls[0][0], pieceID: 'piece-1', totalCOGS: 0 };
      const product = buildProductFromPiece({ piece: spawnedPiece, design });

      expect(findOrder).toHaveBeenCalledWith('custom-1');
      expect(findDesign).toHaveBeenCalledWith('design-1');
      expect(createPiece).toHaveBeenCalledWith(expect.objectContaining({ designID: 'design-1', gemstoneId: 'gem-1' }));
      expect(linkProduction).toHaveBeenCalledWith('custom-1', { designID: 'design-1', pieceID: 'piece-1' });
      expect(product.references.gemstoneId).toBe('gem-1');
    } finally {
      vi.restoreAllMocks();
    }
  });
});

describe('planQuoteLaborHours', () => {
  it('keys bench tasks by lane::process and skips CAD / no-WO lines', () => {
    const m = planQuoteLaborHours([
      { description: 'Set Stone', hours: 0.4, discipline: 'bench_jewelry' },
      { description: 'CAD QC Review', hours: 0, discipline: 'cad' }, // skipped (CAD lane)
      { description: 'GLB Creation', hours: 1, discipline: 'cad', noWorkOrder: false }, // skipped (CAD)
      { description: 'Rush coordination', hours: 2, noWorkOrder: true }, // skipped (no WO)
    ]);
    expect(m.get('bench_jewelry::set stone')).toBe(0.4);
    expect(m.has('cad::cad qc review')).toBe(false);
    expect(m.size).toBe(1);
  });

  it('sums duplicate lane::process entries', () => {
    const m = planQuoteLaborHours([
      { description: 'Polish', hours: 0.5, discipline: 'bench_jewelry' },
      { description: 'polish', hours: 0.25, discipline: 'bench_jewelry' },
    ]);
    expect(m.get('bench_jewelry::polish')).toBe(0.75);
  });
});

describe('applyQuoteHoursToWorkOrders', () => {
  const wos = [
    { workOrderID: 'wo-1', discipline: 'bench_jewelry', tasks: [
      { process: 'Clean up Casting', estLaborHours: 0.8 },
      { process: 'Set Stone', estLaborHours: 0.4 },
    ] },
  ];

  it('updates a matched task whose hours changed, in place', () => {
    const updates = applyQuoteHoursToWorkOrders(wos, [
      { description: 'Clean up Casting', hours: 1.2, discipline: 'bench_jewelry' },
      { description: 'Set Stone', hours: 0.4, discipline: 'bench_jewelry' },
    ]);
    expect(updates).toHaveLength(1);
    expect(updates[0].workOrderID).toBe('wo-1');
    expect(updates[0].tasks).toEqual([
      { process: 'Clean up Casting', estLaborHours: 1.2 }, // changed
      { process: 'Set Stone', estLaborHours: 0.4 },        // unchanged, preserved
    ]);
  });

  it('returns no updates when nothing changed', () => {
    expect(applyQuoteHoursToWorkOrders(wos, [
      { description: 'Clean up Casting', hours: 0.8, discipline: 'bench_jewelry' },
      { description: 'Set Stone', hours: 0.4, discipline: 'bench_jewelry' },
    ])).toEqual([]);
  });

  it('preserves a split: updates the task in whichever WO holds it', () => {
    const split = [
      { workOrderID: 'wo-1', discipline: 'bench_jewelry', tasks: [{ process: 'Clean up Casting', estLaborHours: 0.8 }] },
      { workOrderID: 'wo-2', discipline: 'bench_jewelry', tasks: [{ process: 'Set Stone', estLaborHours: 0.4 }] },
    ];
    const updates = applyQuoteHoursToWorkOrders(split, [
      { description: 'Set Stone', hours: 0.6, discipline: 'bench_jewelry' },
    ]);
    expect(updates).toEqual([{ workOrderID: 'wo-2', tasks: [{ process: 'Set Stone', estLaborHours: 0.6 }] }]);
  });

  it('never adds or removes tasks (structure preserved)', () => {
    // Quote has a task with no matching WO task → not spawned; WO task with no quote match → kept.
    const updates = applyQuoteHoursToWorkOrders(
      [{ workOrderID: 'wo-1', discipline: 'bench_jewelry', tasks: [{ process: 'Set Stone', estLaborHours: 0.4 }] }],
      [{ description: 'Engrave initials', hours: 0.5, discipline: 'engraving' }],
    );
    expect(updates).toEqual([]); // nothing matched, nothing changed
  });
});

describe('reconcileQuoteToWorkOrders (structural sync: update + spawn + cull)', () => {
  const bench = (id, tasks, extra = {}) => ({ workOrderID: id, discipline: 'bench_jewelry', seq: 1, status: 'READY FOR WORK', tasks, ...extra });

  it('appends a newly-added quote task to the lane\'s existing WO', () => {
    const r = reconcileQuoteToWorkOrders(
      [bench('wo-1', [{ process: 'Set Stone', estLaborHours: 0.4 }])],
      [
        { description: 'Set Stone', hours: 0.4, discipline: 'bench_jewelry' },
        { description: 'Polish', hours: 0.3, discipline: 'bench_jewelry' }, // new
      ],
    );
    expect(r.spawns).toEqual([]);
    expect(r.woEmptied).toEqual([]);
    expect(r.woUpdates).toEqual([{ workOrderID: 'wo-1', tasks: [
      { process: 'Set Stone', estLaborHours: 0.4 },
      { process: 'Polish', estLaborHours: 0.3 },
    ] }]);
  });

  it('spawns a new WO when the added task is in a lane with no WO', () => {
    const r = reconcileQuoteToWorkOrders(
      [bench('wo-1', [{ process: 'Set Stone', estLaborHours: 0.4 }])],
      [
        { description: 'Set Stone', hours: 0.4, discipline: 'bench_jewelry' },
        { description: 'Engrave initials', hours: 0.5, discipline: 'engraving' }, // new lane
      ],
    );
    expect(r.woUpdates).toEqual([]);
    expect(r.spawns).toEqual([{ discipline: 'engraving', tasks: [{ process: 'Engrave initials', estLaborHours: 0.5 }] }]);
  });

  it('culls a removed task; empties the WO when its last task is gone', () => {
    const r = reconcileQuoteToWorkOrders(
      [bench('wo-1', [{ process: 'Set Stone', estLaborHours: 0.4 }, { process: 'Polish', estLaborHours: 0.3 }])],
      [{ description: 'Set Stone', hours: 0.4, discipline: 'bench_jewelry' }], // Polish removed
    );
    expect(r.woEmptied).toEqual([]);
    expect(r.woUpdates).toEqual([{ workOrderID: 'wo-1', tasks: [{ process: 'Set Stone', estLaborHours: 0.4 }] }]);

    const r2 = reconcileQuoteToWorkOrders(
      [bench('wo-1', [{ process: 'Polish', estLaborHours: 0.3 }])],
      [{ description: 'Set Stone', hours: 0.4, discipline: 'bench_jewelry' }], // only task removed, Set Stone is new
    );
    // Polish culled → wo-1 emptied; Set Stone has nowhere to go (its only lane WO is emptied) → spawn.
    expect(r2.woEmptied).toEqual([{ workOrderID: 'wo-1', tasks: [] }]);
    expect(r2.spawns).toEqual([{ discipline: 'bench_jewelry', tasks: [{ process: 'Set Stone', estLaborHours: 0.4 }] }]);
  });

  it('preserves a split: updates the task in whichever WO holds it, no spurious spawn', () => {
    const r = reconcileQuoteToWorkOrders(
      [bench('wo-1', [{ process: 'Clean up Casting', estLaborHours: 0.8 }]), bench('wo-2', [{ process: 'Set Stone', estLaborHours: 0.4 }], { seq: 2 })],
      [
        { description: 'Clean up Casting', hours: 0.8, discipline: 'bench_jewelry' },
        { description: 'Set Stone', hours: 0.6, discipline: 'bench_jewelry' }, // hours changed
      ],
    );
    expect(r.spawns).toEqual([]);
    expect(r.woEmptied).toEqual([]);
    expect(r.woUpdates).toEqual([{ workOrderID: 'wo-2', tasks: [{ process: 'Set Stone', estLaborHours: 0.6 }] }]);
  });

  it('no-ops when the plan already matches', () => {
    const r = reconcileQuoteToWorkOrders(
      [bench('wo-1', [{ process: 'Set Stone', estLaborHours: 0.4 }])],
      [{ description: 'Set Stone', hours: 0.4, discipline: 'bench_jewelry' }],
    );
    expect(r).toEqual({ woUpdates: [], woEmptied: [], spawns: [] });
  });

  it('never re-spawns or mutates work already on a COMPLETED/QC work order', () => {
    // The lane's WO is done. Re-saving the same quote must NOT spawn a duplicate, and must
    // not touch the completed WO. (Regression: coverage counts all WOs; mutation is pre-QC only.)
    const r = reconcileQuoteToWorkOrders(
      [bench('wo-done', [{ process: 'Clean up Casting', estLaborHours: 0.8 }, { process: 'Set Stone', estLaborHours: 0.4 }], { status: 'COMPLETED' })],
      [
        { description: 'Clean up Casting', hours: 0.8, discipline: 'bench_jewelry' },
        { description: 'Set Stone', hours: 0.4, discipline: 'bench_jewelry' },
      ],
    );
    expect(r).toEqual({ woUpdates: [], woEmptied: [], spawns: [] });
  });
});
