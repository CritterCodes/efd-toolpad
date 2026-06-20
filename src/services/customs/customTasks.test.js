import { describe, expect, it, vi, beforeEach } from 'vitest';

// customTasks imports the DB layer + TasksService at module load — mock both so the
// unit under test (getCustomTaskLine / mergeAutoLaborLine) runs with no real I/O.
const getTasks = vi.fn();
vi.mock('@/lib/database', () => ({ db: { connect: vi.fn(async () => ({ collection: () => ({ aggregate: () => ({ toArray: async () => [] }) }) })) } }));
vi.mock('@/lib/constants', () => ({ default: { CUSTOM_ORDERS_COLLECTION: 'customOrders' } }));
vi.mock('@/app/api/tasks/service', () => ({ TasksService: { getTasks: (...a) => getTasks(...a) } }));

const { getCustomTaskLine, mergeAutoLaborLine } = await import('@/services/customs/customTasks');

describe('getCustomTaskLine', () => {
  beforeEach(() => getTasks.mockReset());

  it('builds a cad-lane, no-bench-WO labor line from the matched custom task cost', async () => {
    getTasks.mockResolvedValue({ data: [{ title: 'CAD QC Review', pricing: { laborCost: 25, totalLaborHours: 0.5 } }] });
    const line = await getCustomTaskLine('CAD QC Review', { autoKey: 'custom-qc', fallbackCost: 99 });
    expect(line).toMatchObject({ description: 'CAD QC Review', cost: 25, hours: 0.5, discipline: 'cad', noWorkOrder: true, autoKey: 'custom-qc', source: 'auto' });
  });

  it('falls back to fallbackCost when the task is missing or zero-priced', async () => {
    getTasks.mockResolvedValue({ data: [] });
    const missing = await getCustomTaskLine('GLB Creation', { autoKey: 'custom-glb', fallbackCost: 50 });
    expect(missing.cost).toBe(50);

    getTasks.mockResolvedValue({ data: [{ title: 'GLB Creation', pricing: { laborCost: 0 } }] });
    const zero = await getCustomTaskLine('GLB Creation', { autoKey: 'custom-glb', fallbackCost: 50 });
    expect(zero.cost).toBe(50);
  });
});

describe('mergeAutoLaborLine', () => {
  it('replaces a prior line with the same autoKey (idempotent re-assign)', () => {
    const prior = [{ description: 'CAD QC Review', cost: 25, autoKey: 'custom-qc' }, { description: 'Set stone', cost: 40 }];
    const merged = mergeAutoLaborLine(prior, { description: 'CAD QC Review', cost: 30, autoKey: 'custom-qc' });
    expect(merged).toHaveLength(2);
    expect(merged.filter((l) => l.autoKey === 'custom-qc')).toHaveLength(1);
    expect(merged.find((l) => l.autoKey === 'custom-qc').cost).toBe(30);
    expect(merged.find((l) => l.description === 'Set stone')).toBeTruthy();
  });

  it('appends when no matching autoKey exists', () => {
    const merged = mergeAutoLaborLine([{ description: 'polish', cost: 10 }], { description: 'GLB Creation', cost: 50, autoKey: 'custom-glb' });
    expect(merged).toHaveLength(2);
  });
});
