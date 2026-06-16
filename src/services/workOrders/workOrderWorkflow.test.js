import { describe, it, expect } from 'vitest';
import {
  BENCH_QUEUE,
  deriveWorkOrderQueue,
  projectWorkOrder,
  isWorkOrderInTab,
} from './workOrderWorkflow';

describe('deriveWorkOrderQueue', () => {
  it('derives repair queues from the mirrored repair status (reusing repairWorkflow)', () => {
    expect(deriveWorkOrderQueue({ sourceType: 'repair', status: 'IN PROGRESS', assignedToUserID: 'u1' })).toBe(BENCH_QUEUE.IN_PROGRESS);
    expect(deriveWorkOrderQueue({ sourceType: 'repair', status: 'READY FOR WORK', assignedToUserID: null })).toBe(BENCH_QUEUE.UNCLAIMED);
    expect(deriveWorkOrderQueue({ sourceType: 'repair', status: 'NEEDS PARTS' })).toBe(BENCH_QUEUE.WAITING_PARTS);
    expect(deriveWorkOrderQueue({ sourceType: 'repair', status: 'PARTS ORDERED' })).toBe(BENCH_QUEUE.WAITING_PARTS);
    expect(deriveWorkOrderQueue({ sourceType: 'repair', status: 'COMMUNICATION REQUIRED' })).toBe(BENCH_QUEUE.COMMUNICATIONS);
    expect(deriveWorkOrderQueue({ sourceType: 'repair', status: 'QC' })).toBe(BENCH_QUEUE.QC);
  });

  it('keeps completed repairs off the bench', () => {
    expect(deriveWorkOrderQueue({ sourceType: 'repair', status: 'COMPLETED' })).toBeNull();
  });

  it('derives piece queues from the work-order status', () => {
    expect(deriveWorkOrderQueue({ sourceType: 'production_piece', status: 'READY FOR WORK' })).toBe(BENCH_QUEUE.UNCLAIMED);
    expect(deriveWorkOrderQueue({ sourceType: 'production_piece', status: 'IN PROGRESS', assignedToUserID: 'u1' })).toBe(BENCH_QUEUE.IN_PROGRESS);
    expect(deriveWorkOrderQueue({ sourceType: 'production_piece', status: 'QC' })).toBe(BENCH_QUEUE.QC);
    expect(deriveWorkOrderQueue({ sourceType: 'production_piece', status: 'COMPLETED' })).toBeNull();
  });

  it('treats an unassigned piece as unclaimed even without an explicit status', () => {
    expect(deriveWorkOrderQueue({ sourceType: 'custom_piece', status: null })).toBe(BENCH_QUEUE.UNCLAIMED);
  });
});

describe('projectWorkOrder + isWorkOrderInTab', () => {
  const mineInProgress = projectWorkOrder({ sourceType: 'repair', status: 'IN PROGRESS', assignedToUserID: 'me' });
  const otherInProgress = projectWorkOrder({ sourceType: 'repair', status: 'IN PROGRESS', assignedToUserID: 'someone-else' });
  const unclaimed = projectWorkOrder({ sourceType: 'repair', status: 'READY FOR WORK', assignedToUserID: null });

  it('attaches a derived benchQueue', () => {
    expect(mineInProgress.benchQueue).toBe(BENCH_QUEUE.IN_PROGRESS);
    expect(mineInProgress.isBenchVisible).toBe(true);
  });

  it('puts only the caller-assigned work in the Mine tab', () => {
    expect(isWorkOrderInTab(mineInProgress, BENCH_QUEUE.MINE, 'me')).toBe(true);
    expect(isWorkOrderInTab(otherInProgress, BENCH_QUEUE.MINE, 'me')).toBe(false);
  });

  it('routes unclaimed work to the Unclaimed tab', () => {
    expect(isWorkOrderInTab(unclaimed, BENCH_QUEUE.UNCLAIMED, 'me')).toBe(true);
    expect(isWorkOrderInTab(unclaimed, BENCH_QUEUE.MINE, 'me')).toBe(false);
  });
});
