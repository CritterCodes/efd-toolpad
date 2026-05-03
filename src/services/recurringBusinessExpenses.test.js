import { describe, expect, it } from 'vitest';
import {
  buildRecurringExpenseRow,
  getNextRecurringOccurrence,
  getOccurrenceDueDates,
  RECURRING_EXPENSE_DEFAULT_STATUS,
} from './recurringBusinessExpenses';

describe('recurringBusinessExpenses', () => {
  it('computes weekly occurrences on the configured weekday', () => {
    const next = getNextRecurringOccurrence({
      frequency: 'weekly',
      dayOfWeek: 5,
      startDate: '2026-05-01T00:00:00.000Z',
    }, '2026-05-02T00:00:00.000Z');

    expect(next.toISOString()).toBe('2026-05-08T00:00:00.000Z');
  });

  it('computes monthly occurrences with a clamped day of month', () => {
    const next = getNextRecurringOccurrence({
      frequency: 'monthly',
      dayOfMonth: 31,
      startDate: '2026-01-31T00:00:00.000Z',
    }, '2026-02-15T00:00:00.000Z');

    expect(next.toISOString()).toBe('2026-02-28T00:00:00.000Z');
  });

  it('returns all due dates through the requested boundary', () => {
    const due = getOccurrenceDueDates({
      recurringExpenseID: 'rexp-1',
      frequency: 'monthly',
      dayOfMonth: 1,
      startDate: '2026-05-01T00:00:00.000Z',
      nextOccurrenceDate: '2026-05-01T00:00:00.000Z',
    }, '2026-07-15T00:00:00.000Z');

    expect(due.map((value) => value.toISOString())).toEqual([
      '2026-05-01T00:00:00.000Z',
      '2026-06-01T00:00:00.000Z',
      '2026-07-01T00:00:00.000Z',
    ]);
  });

  it('defaults recurring expense rows to scheduled with recurrence metadata', () => {
    const row = buildRecurringExpenseRow({
      recurringExpenseID: 'rexp-1',
      vendor: 'Adobe',
      category: 'Software',
      amount: 59.99,
      paymentMethod: 'credit_card',
      isDeductible: true,
      notes: 'Creative Cloud',
    }, '2026-05-15T00:00:00.000Z');

    expect(row).toMatchObject({
      vendor: 'Adobe',
      category: 'Software',
      amount: 59.99,
      paymentMethod: 'credit_card',
      status: RECURRING_EXPENSE_DEFAULT_STATUS,
      sourceRecurringExpenseID: 'rexp-1',
      sourceType: 'recurring',
      isDeductible: true,
    });
  });
});
