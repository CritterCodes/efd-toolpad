import { describe, expect, it } from 'vitest';
import { planQuoteLaborHours, applyQuoteHoursToWorkOrders } from '@/services/customs/customProduction';

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
