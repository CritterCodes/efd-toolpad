import { describe, expect, it } from 'vitest';
import {
  BENCH_QUEUE,
  LEGACY_BENCH_STATUS,
  REPAIR_STATUS,
  buildCompleteFromQcUpdate,
  buildMoveStatusUpdate,
  deriveBenchQueue,
  deriveCompatibilityBenchStatus,
  normalizeRepairStatus,
} from './repairWorkflow';

describe('repairWorkflow', () => {
  it('normalizes legacy statuses into canonical workflow statuses', () => {
    expect(normalizeRepairStatus('ready-for-work')).toBe(REPAIR_STATUS.READY_FOR_WORK);
    expect(normalizeRepairStatus('quality-control')).toBe(REPAIR_STATUS.QC);
    expect(normalizeRepairStatus('ready')).toBe(REPAIR_STATUS.READY_FOR_PICKUP);
    expect(normalizeRepairStatus('PAID_CLOSED')).toBe(REPAIR_STATUS.PAID_CLOSED);
  });

  it('derives bench queues from canonical status and assignment', () => {
    expect(deriveBenchQueue({ status: 'READY FOR WORK' })).toBe(BENCH_QUEUE.UNCLAIMED);
    expect(deriveBenchQueue({ status: 'READY FOR WORK', assignedTo: 'j1' })).toBe(BENCH_QUEUE.IN_PROGRESS);
    expect(deriveBenchQueue({ status: 'COMMUNICATION REQUIRED' })).toBe(BENCH_QUEUE.COMMUNICATIONS);
    expect(deriveBenchQueue({ status: 'PARTS ORDERED' })).toBe(BENCH_QUEUE.WAITING_PARTS);
    expect(deriveBenchQueue({ status: 'QC' })).toBe(BENCH_QUEUE.QC);
    expect(deriveBenchQueue({ status: 'READY FOR PICKUP' })).toBeNull();
  });

  it('falls back to legacy benchStatus when status is missing or unmapped', () => {
    expect(deriveBenchQueue({ benchStatus: 'WAITING_PARTS' })).toBe(BENCH_QUEUE.WAITING_PARTS);
    expect(deriveCompatibilityBenchStatus({ status: 'COMMUNICATION REQUIRED' })).toBe(LEGACY_BENCH_STATUS.COMMUNICATIONS);
  });

  it('does not let stale benchStatus leak closed repairs back onto the bench', () => {
    expect(deriveBenchQueue({ status: 'PAID_CLOSED', benchStatus: 'UNCLAIMED' })).toBeNull();
    expect(deriveBenchQueue({ status: 'READY FOR PICKUP', benchStatus: 'IN_PROGRESS' })).toBeNull();
  });

  it('builds canonical move updates with compatibility benchStatus', () => {
    const update = buildMoveStatusUpdate('ready-for-work', {}, { assignedTo: '' });
    expect(update.status).toBe(REPAIR_STATUS.READY_FOR_WORK);
    expect(update.benchStatus).toBe(LEGACY_BENCH_STATUS.UNCLAIMED);
  });

  it('completes QC only into allowed canonical statuses', () => {
    const update = buildCompleteFromQcUpdate({ nextStatus: 'READY FOR PICKUP', userName: 'QC User' });
    expect(update.status).toBe(REPAIR_STATUS.READY_FOR_PICKUP);
    expect(update.benchStatus).toBeNull();
    expect(() => buildCompleteFromQcUpdate({ nextStatus: 'NEEDS PARTS', userName: 'QC User' })).toThrow();
  });
});
