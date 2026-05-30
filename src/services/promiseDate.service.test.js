import { describe, expect, it } from 'vitest';
import {
  addBusinessDays,
  estimatePromiseDate,
  nextDeliveryDay,
  toDateInputValue,
} from './promiseDate.service';

// Fixed reference points (local time). 2026-06-01 is a Monday.
const MON = new Date(2026, 5, 1); // Mon Jun 1 2026
const TUE = new Date(2026, 5, 2); // Tue Jun 2 2026
const FRI = new Date(2026, 5, 5); // Fri Jun 5 2026

const task = (totalLaborHours, rushDays = 1) => ({
  pricing: { totalLaborHours },
  service: { rushDays },
});

describe('addBusinessDays', () => {
  it('skips weekends', () => {
    // Fri + 1 business day = Mon
    expect(toDateInputValue(addBusinessDays(FRI, 1))).toBe('2026-06-08');
    // Mon + 4 business days = Fri
    expect(toDateInputValue(addBusinessDays(MON, 4))).toBe('2026-06-05');
    // Mon + 5 business days = next Mon
    expect(toDateInputValue(addBusinessDays(MON, 5))).toBe('2026-06-08');
  });

  it('advances a weekend start to the next business day before counting', () => {
    const SAT = new Date(2026, 5, 6);
    expect(toDateInputValue(addBusinessDays(SAT, 0))).toBe('2026-06-08'); // Mon
  });
});

describe('nextDeliveryDay (Tue/Thu)', () => {
  it('returns the same day when it is already a delivery day', () => {
    expect(toDateInputValue(nextDeliveryDay(TUE))).toBe('2026-06-02');
  });
  it('snaps forward to the next Tue/Thu', () => {
    expect(toDateInputValue(nextDeliveryDay(MON))).toBe('2026-06-02'); // Mon -> Tue
    expect(toDateInputValue(nextDeliveryDay(FRI))).toBe('2026-06-09'); // Fri -> next Tue
    expect(toDateInputValue(nextDeliveryDay(new Date(2026, 5, 3)))).toBe('2026-06-04'); // Wed -> Thu
  });
});

describe('estimatePromiseDate — retail (load-driven)', () => {
  it('a small job is sized by load, NOT floored to avg turnaround', () => {
    const r = estimatePromiseDate({
      tasks: [task(0.5)],
      openWorkloadHours: 1,
      avgTurnaroundDays: 3.4, // would have floored to 3 under the old model
      dailyCapacityHours: 10,
      now: MON,
    });
    // loadDays = ceil((1 + 0.5)/10) = 1; turnaround ignored because job has hours
    expect(r.baseDays).toBe(1);
    expect(r.breakdown.usedTurnaroundFallback).toBe(false);
    expect(toDateInputValue(r.suggestedDate)).toBe('2026-06-02'); // Mon + 1 biz = Tue
  });

  it('scales with queue + job hours', () => {
    const r = estimatePromiseDate({
      tasks: [task(10)],
      openWorkloadHours: 40,
      avgTurnaroundDays: 3.4,
      dailyCapacityHours: 10,
      now: MON,
    });
    // loadDays = ceil((40 + 10)/10) = 5
    expect(r.baseDays).toBe(5);
    expect(toDateInputValue(r.suggestedDate)).toBe('2026-06-08'); // Mon + 5 biz = next Mon
  });

  it('falls back to avg turnaround when the job has no logged hours', () => {
    const r = estimatePromiseDate({
      tasks: [],
      openWorkloadHours: 0,
      avgTurnaroundDays: 3.4,
      dailyCapacityHours: 10,
      now: MON,
    });
    expect(r.breakdown.jobHours).toBe(0);
    expect(r.breakdown.usedTurnaroundFallback).toBe(true);
    expect(r.baseDays).toBe(3); // round(3.4)
  });

  it('multiplies task labor hours by quantity (set 4 stones = 4×)', () => {
    const r = estimatePromiseDate({
      tasks: [{ pricing: { totalLaborHours: 0.2 }, quantity: 4 }],
      openWorkloadHours: 0,
      avgTurnaroundDays: 0,
      dailyCapacityHours: 10,
      now: MON,
    });
    expect(r.breakdown.jobHours).toBe(0.8);
  });

  it('is deterministic for the same inputs', () => {
    const args = {
      tasks: [task(2)],
      openWorkloadHours: 12,
      avgTurnaroundDays: 3,
      dailyCapacityHours: 10,
      now: MON,
    };
    expect(estimatePromiseDate(args)).toEqual(estimatePromiseDate(args));
  });
});

describe('estimatePromiseDate — rush', () => {
  it('lands on the next day regardless of job size or backlog', () => {
    const base = {
      tasks: [task(40, 1)],
      openWorkloadHours: 200,
      avgTurnaroundDays: 7,
      dailyCapacityHours: 10,
      now: MON,
    };
    const normal = estimatePromiseDate(base);
    const rush = estimatePromiseDate({ ...base, isRush: true });
    expect(rush.baseDays).toBe(1);
    // Mon Jun 1 -> next day Tue Jun 2, ignoring the huge backlog/job
    expect(toDateInputValue(rush.suggestedDate)).toBe('2026-06-02');
    expect(rush.suggestedDate.getTime()).toBeLessThan(normal.suggestedDate.getTime());
  });

  it('promises the next calendar day even when it is a weekend', () => {
    const rush = estimatePromiseDate({
      tasks: [task(2)],
      isRush: true,
      dailyCapacityHours: 10,
      now: FRI, // Fri Jun 5
    });
    expect(toDateInputValue(rush.suggestedDate)).toBe('2026-06-06'); // Sat
  });
});

describe('estimatePromiseDate — wholesale delivery days', () => {
  it('snaps the return to the next Tue/Thu (pickup Tue, ~3-day turnaround → next Tue)', () => {
    const r = estimatePromiseDate({
      tasks: [task(1)],
      isWholesale: true,
      openWorkloadHours: 25, // ceil((25+1)/10) = 3 base days
      avgTurnaroundDays: 3,
      dailyCapacityHours: 10,
      now: TUE,
    });
    expect(r.baseDays).toBe(3);
    expect(r.breakdown.workStart).toBe('2026-06-02'); // starts Tue
    // Tue + 3 biz = Fri 6/5 -> next delivery day = Tue 6/9
    expect(toDateInputValue(r.suggestedDate)).toBe('2026-06-09');
    expect(r.breakdown.deliveryAdjusted).toBe(true);
  });

  it('starts the clock on the next delivery day when intake is off-schedule', () => {
    const r = estimatePromiseDate({
      tasks: [task(1)],
      isWholesale: true,
      openWorkloadHours: 0,
      avgTurnaroundDays: 3,
      dailyCapacityHours: 10,
      now: MON, // not a delivery day
    });
    expect(r.breakdown.workStart).toBe('2026-06-02'); // snapped to Tue
  });

  it('rush wholesale bypasses the delivery schedule', () => {
    const r = estimatePromiseDate({
      tasks: [task(1, 1)],
      isWholesale: true,
      isRush: true,
      openWorkloadHours: 100,
      avgTurnaroundDays: 3,
      dailyCapacityHours: 10,
      now: MON,
    });
    expect(r.breakdown.deliveryAdjusted).toBe(false);
    expect(toDateInputValue(r.suggestedDate)).toBe('2026-06-02'); // Mon + 1 day = Tue, no snapping
  });
});
