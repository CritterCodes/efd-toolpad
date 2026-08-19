import { describe, expect, it, vi, beforeEach } from 'vitest';

// customTasks imports the DB layer + TasksService at module load — mock both so the
// unit under test (getCustomTaskLine / mergeAutoLaborLine) runs with no real I/O.
const getTasks = vi.fn();
let customHistory = [];
vi.mock('@/lib/database', () => ({ db: { connect: vi.fn(async () => ({ collection: () => ({ aggregate: () => ({ toArray: async () => customHistory }) }) })) } }));
vi.mock('@/lib/constants', () => ({ default: { CUSTOM_ORDERS_COLLECTION: 'customOrders' } }));
vi.mock('@/app/api/tasks/service', () => ({ TasksService: { getTasks: (...a) => getTasks(...a) } }));

const { getCustomTaskLine, mergeAutoLaborLine, getTaskSuggestions } = await import('@/services/customs/customTasks');

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

  it('derives hours at the shop wage for flat-priced tasks that store none', async () => {
    // A flat $25 QC fee with no catalog hours used to auto-fill hours 0 into the quote form.
    getTasks.mockResolvedValue({ data: [{ title: 'CAD QC Review', pricing: { laborCost: 25 } }] });
    const line = await getCustomTaskLine('CAD QC Review', { autoKey: 'custom-qc' });
    expect(line.hours).toBe(0.5); // 25 / 50 (default wage)
  });

  it('honours discipline/noWorkOrder overrides for real bench work (casting cleanup)', async () => {
    getTasks.mockResolvedValue({ data: [] });
    const line = await getCustomTaskLine('Clean up Casting', {
      autoKey: 'auto-casting-cleanup', fallbackCost: 40, discipline: 'bench_jewelry', noWorkOrder: false,
    });
    expect(line).toMatchObject({ description: 'Clean up Casting', cost: 40, discipline: 'bench_jewelry', noWorkOrder: false });
    expect(line.hours).toBe(0.8); // 40 / 50 — bench WO hours drive the artisan payout
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


/**
 * Labor HOURS are what the bench jeweler is paid for. The historical-custom branch of the suggestion
 * list hardcoded hours to 0, so picking a task you had already priced on an earlier order refilled the
 * cost and silently blanked the hours — the quote builder retyped them from memory every time, and any
 * that were missed produced a work order with no payout.
 *
 * This matters more than it looks: NO task in the catalog is tagged `contexts: 'custom'`, so the
 * repair-catalog branch returns nothing for the quote builder and history is the ONLY source of
 * suggestions it sees.
 */
describe('getTaskSuggestions carries labor hours', () => {
  beforeEach(() => { customHistory = []; getTasks.mockReset(); getTasks.mockResolvedValue({ data: [] }); });

  it('returns the hours a historical custom task was quoted with', async () => {
    customHistory = [{ _id: 'Set center stone', cost: 40, hours: 0.8, discipline: 'bench_jewelry' }];
    const [s] = await getTaskSuggestions('', 40, 'custom');
    expect(s).toMatchObject({ label: 'Set center stone', cost: 40, hours: 0.8, source: 'custom' });
  });

  it('carries the discipline too, so the lane is not re-picked by hand', async () => {
    customHistory = [{ _id: 'Clean up casting', cost: 69.52, hours: 0.8, discipline: 'bench_jewelry' }];
    expect((await getTaskSuggestions('', 40, 'custom'))[0].category).toBe('bench_jewelry');
  });

  it('derives hours from cost at the shop wage when history predates hours being stored', async () => {
    // $25 at the $50/hr default wage → 0.5h. Zero hours meant a work order with no payout;
    // a derived estimate is editable and starts sane instead of silently blank.
    customHistory = [{ _id: 'Old line', cost: 25 }];
    expect((await getTaskSuggestions('', 40, 'custom'))[0].hours).toBe(0.5);
  });

  it('still prefers the repair catalog when a label appears in both', async () => {
    // The catalog is the richer, priced-by-the-engine source.
    getTasks.mockResolvedValue({ data: [{ title: 'Set Stone 1ct or larger', pricing: { laborCost: 30, totalLaborHours: 0.4 }, category: 'setting' }] });
    customHistory = [{ _id: 'set stone 1ct or larger', cost: 99, hours: 9 }];
    const out = await getTaskSuggestions('', 40, 'custom');
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ cost: 30, hours: 0.4, source: 'repair' });
  });
});
