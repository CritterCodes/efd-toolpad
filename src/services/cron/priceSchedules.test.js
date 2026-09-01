import { describe, it, expect } from 'vitest';
import { isScheduleDue, mostRecentTarget, normalizeSchedule } from './priceSchedules';

/**
 * The gate that turned hardcoded vercel.json times into owner-editable
 * settings. Catch-up semantics matter most: a missed window must run on the
 * next hourly tick, not silently skip to the next period — that silent skip
 * is how the old crons "ran" for weeks without running.
 */
const at = (iso) => new Date(iso);

describe('isScheduleDue', () => {
  const daily9 = { frequency: 'daily', hourUtc: 9, dayOfWeek: 1 };

  it('daily: not due before the hour, due at it, once only', () => {
    expect(isScheduleDue(daily9, at('2026-09-01T09:05:00Z'), at('2026-09-01T08:05:00Z'))).toBe(false);
    expect(isScheduleDue(daily9, null, at('2026-09-01T09:05:00Z'))).toBe(true);
    expect(isScheduleDue(daily9, at('2026-09-01T09:05:00Z'), at('2026-09-01T15:00:00Z'))).toBe(false);
    expect(isScheduleDue(daily9, at('2026-09-01T09:05:00Z'), at('2026-09-02T09:01:00Z'))).toBe(true);
  });

  it('CATCH-UP: a missed window runs at the next tick instead of skipping a day', () => {
    // last ran Aug 30; deploy outage covered Aug 31 09:00 — Sep 1 midnight tick catches up.
    expect(isScheduleDue(daily9, at('2026-08-30T09:05:00Z'), at('2026-09-01T00:05:00Z'))).toBe(true);
  });

  it('weekly: due on the configured day, once', () => {
    const mon10 = { frequency: 'weekly', hourUtc: 10, dayOfWeek: 1 };
    // 2026-09-07 is a Monday
    expect(isScheduleDue(mon10, at('2026-08-31T10:05:00Z'), at('2026-09-06T12:00:00Z'))).toBe(false);
    expect(isScheduleDue(mon10, at('2026-08-31T10:05:00Z'), at('2026-09-07T10:05:00Z'))).toBe(true);
    expect(isScheduleDue(mon10, at('2026-09-07T10:05:00Z'), at('2026-09-07T18:00:00Z'))).toBe(false);
  });

  it('monthly: the 1st at the configured hour', () => {
    const m9 = { frequency: 'monthly', hourUtc: 9 };
    expect(isScheduleDue(m9, at('2026-08-01T09:05:00Z'), at('2026-08-20T09:05:00Z'))).toBe(false);
    expect(isScheduleDue(m9, at('2026-08-01T09:05:00Z'), at('2026-09-01T09:05:00Z'))).toBe(true);
  });

  it('hourly: 55-minute spacing; paused: never', () => {
    const hourly = { frequency: 'hourly', hourUtc: 0, dayOfWeek: 0 };
    expect(isScheduleDue(hourly, at('2026-09-01T09:00:00Z'), at('2026-09-01T09:30:00Z'))).toBe(false);
    expect(isScheduleDue(hourly, at('2026-09-01T09:00:00Z'), at('2026-09-01T10:00:00Z'))).toBe(true);
    expect(isScheduleDue({ frequency: 'paused' }, null, at('2026-09-01T09:00:00Z'))).toBe(false);
  });
});

describe('mostRecentTarget', () => {
  it('weekly target wraps to the previous week when the day is ahead', () => {
    const fri8 = { frequency: 'weekly', hourUtc: 8, dayOfWeek: 5 };
    // Tue Sep 1 2026 → most recent Friday 08:00 is Aug 28
    expect(mostRecentTarget(fri8, at('2026-09-01T12:00:00Z')).toISOString()).toBe('2026-08-28T08:00:00.000Z');
  });
});

describe('normalizeSchedule', () => {
  it('clamps garbage to the job defaults — a bad save can never wedge a job', () => {
    const out = normalizeSchedule({ frequency: 'sometimes', hourUtc: 99, dayOfWeek: -3 }, 'metalPrices');
    expect(out).toEqual({ frequency: 'daily', hourUtc: 9, dayOfWeek: 1 });
  });
});
