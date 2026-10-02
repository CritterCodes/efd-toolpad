import { describe, it, expect } from 'vitest';
import {
  formatMoney, getRepairChargeTotal, getRepairSuggestedLaborHours, getWorkItemLabels, formatSourceAction, jewelerName,
} from './ReviewCard';

/**
 * The figures a reviewer judges a labour log by, pulled out of the Labor Review page on 2026-10-02.
 * They decide what a jeweller is credited, so they are pinned rather than left to the page.
 */
describe('getRepairChargeTotal', () => {
  it('prefers the ticket\'s own total when it has one', () => {
    const repair = { totalCost: 123.45, tasks: [{ price: 10, quantity: 1 }] };
    expect(getRepairChargeTotal(repair)).toBe(123.45);
  });

  it('adds up tasks, materials and custom charges when there is no total', () => {
    expect(getRepairChargeTotal({
      totalCost: 0,
      tasks: [{ price: 24, quantity: 2 }],
      materials: [{ price: 5, quantity: 3 }],
      customLineItems: [{ price: 10, quantity: 1 }],
    })).toBe(73); // 48 + 15 + 10
  });

  it('counts a line with no quantity as one, never zero', () => {
    expect(getRepairChargeTotal({ tasks: [{ price: 30 }] })).toBe(30);
    expect(getRepairChargeTotal({ tasks: [{ price: 30, quantity: 0 }] })).toBe(30);
  });

  it('falls back through the price field names a line may carry', () => {
    expect(getRepairChargeTotal({ tasks: [{ retailPrice: 40, quantity: 1 }] })).toBe(40);
    expect(getRepairChargeTotal({ materials: [{ unitCost: 7, quantity: 2 }] })).toBe(14);
    expect(getRepairChargeTotal({ materials: [{ costPerPortion: 3, quantity: 2 }] })).toBe(6);
  });

  it('is 0 for an empty ticket rather than NaN', () => {
    expect(getRepairChargeTotal({})).toBe(0);
    expect(getRepairChargeTotal()).toBe(0);
  });
});

describe('getRepairSuggestedLaborHours', () => {
  it('counts hours on tasks, times quantity', () => {
    expect(getRepairSuggestedLaborHours({ tasks: [{ laborHours: 0.25, quantity: 4 }] })).toBe(1);
  });

  it('prefers the priced total hours over the raw field', () => {
    expect(getRepairSuggestedLaborHours({ tasks: [{ pricing: { totalLaborHours: 0.5 }, laborHours: 0.2, quantity: 2 }] })).toBe(1);
  });

  it('ignores customLineItems — those are charges, not labour (owner, 2026-09-18)', () => {
    const repair = { tasks: [{ laborHours: 0.5, quantity: 1 }], customLineItems: [{ laborHours: 99, quantity: 1, price: 100 }] };
    expect(getRepairSuggestedLaborHours(repair)).toBe(0.5);
  });

  it('rounds to two places and survives an empty ticket', () => {
    expect(getRepairSuggestedLaborHours({ tasks: [{ laborHours: 0.333, quantity: 1 }] })).toBe(0.33);
    expect(getRepairSuggestedLaborHours({})).toBe(0);
  });
});

describe('the small formatters', () => {
  it('formats money, including nothing', () => {
    expect(formatMoney(12.5)).toBe('$12.50');
    expect(formatMoney()).toBe('$0.00');
  });

  it('lists every work item by whichever name it carries', () => {
    expect(getWorkItemLabels({
      tasks: [{ name: 'Size Down' }],
      materials: [{ itemNumber: 'RT-123' }],
      customLineItems: [{ description: 'Courier' }],
      processes: [{ description: 'Polish' }],
    })).toEqual(['Size Down', 'Polish', 'RT-123', 'Courier']);
  });

  it('turns a source action into words', () => {
    expect(formatSourceAction('qc_pass')).toBe('Qc Pass');
    expect(formatSourceAction('')).toBe('');
  });

  it('names a jeweller by whatever the record has', () => {
    expect(jewelerName({ firstName: 'Bea', lastName: 'Bench' })).toBe('Bea Bench');
    expect(jewelerName({ email: 'b@x.test' })).toBe('b@x.test');
    expect(jewelerName({ userID: 'u-1' })).toBe('u-1');
  });
});
