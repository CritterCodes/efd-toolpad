import { describe, expect, it } from 'vitest';
import {
  buildBenchSummary, recentRepairActivity, repairDisplayName, openRepairs, overdueRepairs,
} from './dashboardMetrics';

/**
 * The shape below is production as it stood on 2026-10-13: 721 repairs, of which 541 PAID_CLOSED,
 * 134 spam, 2 lead, 20 delivery-batched, 14 ready for pickup, 7 ready for work, 3 in progress.
 * The old dashboard called all 721 "active".
 */
const productionShape = () => [
  ...Array.from({ length: 541 }, (_, i) => ({ repairID: `c${i}`, status: 'PAID_CLOSED', clientName: 'Closed' })),
  ...Array.from({ length: 134 }, (_, i) => ({ repairID: `s${i}`, status: 'spam' })),
  ...Array.from({ length: 2 }, (_, i) => ({ repairID: `l${i}`, status: 'lead' })),
  ...Array.from({ length: 20 }, (_, i) => ({ repairID: `d${i}`, status: 'DELIVERY BATCHED', clientName: 'Batched' })),
  ...Array.from({ length: 14 }, (_, i) => ({ repairID: `p${i}`, status: 'READY FOR PICKUP', clientName: 'Waiting' })),
  ...Array.from({ length: 7 }, (_, i) => ({ repairID: `w${i}`, status: 'READY FOR WORK', clientName: 'The Smith' })),
  ...Array.from({ length: 3 }, (_, i) => ({ repairID: `i${i}`, status: 'IN PROGRESS', clientName: 'Rocky' })),
];

describe('dashboard metrics', () => {
  it('counts what is on the bench, not everything ever recorded', () => {
    const all = productionShape();
    expect(all).toHaveLength(721);

    const bench = buildBenchSummary(all);
    // The headline said 721. The truth is ten.
    expect(bench.openCount).toBe(10);
    expect(bench.junkCount).toBe(136);
    expect(bench.realCount).toBe(585);
    expect(bench.openSummary).toBe('7 ready for work · 3 in progress');
  });

  it('never counts spam or leads as work', () => {
    const open = openRepairs([
      { status: 'spam' }, { status: 'lead' }, { status: 'IN PROGRESS' },
    ]);
    expect(open).toHaveLength(1);
    expect(open[0].status).toBe('IN PROGRESS');
  });

  it('flags only open work that is genuinely late', () => {
    const now = new Date('2026-10-13T12:00:00Z');
    const late = overdueRepairs([
      { status: 'IN PROGRESS', promiseDate: '2026-10-01' },   // late
      { status: 'READY FOR WORK', promiseDate: '2026-10-30' }, // not yet
      { status: 'PAID_CLOSED', promiseDate: '2026-01-01' },    // finished, not late
      { status: 'spam', promiseDate: '2026-01-01' },           // not a repair
      { status: 'IN PROGRESS' },                               // no promise date
    ], now);
    expect(late).toHaveLength(1);
    expect(late[0].promiseDate).toBe('2026-10-01');
  });

  it('counts finished work waiting to be collected', () => {
    expect(buildBenchSummary(productionShape()).awaitingPickupCount).toBe(14);
  });

  it('names the customer — `customerName` does not exist on a repair', () => {
    // All 721 production rows carry clientName and none carries customerName, which is why every
    // row of the activity feed read "Unknown Customer".
    expect(repairDisplayName({ clientName: 'Jana Smith' })).toBe('Jana Smith');
    expect(repairDisplayName({ storeName: "Rocky's Corner" })).toBe("Rocky's Corner");
    expect(repairDisplayName({ clientName: 'Mike', storeName: "Rocky's" })).toBe('Mike');
    expect(repairDisplayName({ customerName: 'ignored' })).toBe('No customer on ticket');
    expect(repairDisplayName({})).toBe('No customer on ticket');
  });

  it('shows recent activity with real names and no spam', () => {
    const feed = recentRepairActivity([
      { repairID: 'a', status: 'READY FOR WORK', clientName: 'The Smith', updatedAt: '2026-10-13T10:00:00Z' },
      { repairID: 'junk', status: 'spam', clientName: 'Bot', updatedAt: '2026-10-13T11:00:00Z' },
      { repairID: 'b', status: 'IN PROGRESS', storeName: "Rocky's Corner", updatedAt: '2026-10-12T10:00:00Z' },
    ]);
    expect(feed.map((f) => f.id)).toEqual(['a', 'b']);
    expect(feed[0].customerName).toBe('The Smith');
    expect(feed[1].customerName).toBe("Rocky's Corner");
  });

  it('says what the job is in a few words, not a paragraph', () => {
    const paragraph = 'This pair of yellow gold drop earrings features a curved hoop design set with alternating dark rectangular stones and sparkling clear round stones.';
    const [row] = recentRepairActivity([{ repairID: 'x', clientName: 'A', description: paragraph, updatedAt: '2026-10-13' }]);
    expect(row.type.length).toBeLessThanOrEqual(64);
    expect(row.type.endsWith('…')).toBe(true);

    // The tasks say it better than the description does.
    const [withTasks] = recentRepairActivity([{
      repairID: 'y', clientName: 'B', description: paragraph, updatedAt: '2026-10-13',
      tasks: [{ title: 'Size Down' }, { title: 'Rhodium Plating' }, { title: 'Clean and Polish' }],
    }]);
    expect(withTasks.type).toBe('Size Down · Rhodium Plating +1');
  });

  it('says something sensible when there is no work at all', () => {
    const bench = buildBenchSummary([]);
    expect(bench.openCount).toBe(0);
    expect(bench.openSummary).toBe('');
    expect(recentRepairActivity([])).toEqual([]);
  });
});
