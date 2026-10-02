import { describe, it, expect } from 'vitest';
import { calculateDisplayedRepairTotal, buildWorkItems, getStatusColor, money, day } from './repairDetailView';

/**
 * The three pure functions behind the repair detail screen, pulled out of page.js on 2026-10-02. The total is the
 * number the client is quoted off this page, so its fallback rule matters: add the lines up, and only show the
 * stored total when that sum comes to nothing.
 */
describe('calculateDisplayedRepairTotal', () => {
    it('adds the line items up across all five places a line can live', () => {
        const total = calculateDisplayedRepairTotal({
            tasks: [{ price: 40, quantity: 2 }],
            processes: [{ price: 5 }],
            materials: [{ price: 12.5, quantity: 1 }],
            customLineItems: [{ price: 20 }],
            repairTasks: [{ price: 2.5 }],
            totalCost: 999,
        });
        expect(total).toBe(120);
    });

    it('counts a missing quantity as one', () => {
        expect(calculateDisplayedRepairTotal({ tasks: [{ price: 30 }] })).toBe(30);
    });

    it('adds rush, delivery and tax on top', () => {
        const total = calculateDisplayedRepairTotal({
            tasks: [{ price: 100 }],
            rushJobFee: '25',
            deliveryFee: '10',
            taxAmount: '8.25',
        });
        expect(total).toBeCloseTo(143.25, 2);
    });

    it('reads rushFee or rushJobFee, whichever the ticket carries', () => {
        expect(calculateDisplayedRepairTotal({ rushFee: 15 })).toBe(15);
        expect(calculateDisplayedRepairTotal({ rushJobFee: 15 })).toBe(15);
    });

    it('falls back to the stored total only when the lines come to nothing', () => {
        // A ticket whose lines were cleared still shows the client the number they were given.
        expect(calculateDisplayedRepairTotal({ tasks: [], totalCost: 96 })).toBe(96);
        expect(calculateDisplayedRepairTotal({ totalPrice: 55 })).toBe(55);
        // ...but a ticket that does have lines is never overridden by a stale stored total.
        expect(calculateDisplayedRepairTotal({ tasks: [{ price: 10 }], totalCost: 999 })).toBe(10);
    });

    it('is 0, not NaN, for an empty or missing ticket', () => {
        expect(calculateDisplayedRepairTotal({})).toBe(0);
        expect(calculateDisplayedRepairTotal(null)).toBe(0);
        expect(calculateDisplayedRepairTotal({ tasks: [{ price: 'not a number' }] })).toBe(0);
    });
});

describe('buildWorkItems', () => {
    it('labels each line by where it came from and keeps the order', () => {
        const items = buildWorkItems({
            tasks: [{ name: 'Retip' }],
            processes: [{ name: 'Polish' }],
            materials: [{ name: '14k wire' }],
            customLineItems: [{ name: 'Courier' }],
            repairTasks: [{ name: 'Old line' }],
        });
        expect(items.map(i => i.type)).toEqual(['Task', 'Process', 'Material', 'Custom', 'Legacy Task']);
        expect(items.map(i => i.category)).toEqual(['Service', 'Service', 'Material', 'Custom', 'Legacy']);
        expect(items[0].name).toBe('Retip');
    });

    it('keeps every other field on the line', () => {
        const [item] = buildWorkItems({ materials: [{ name: 'Stock', price: 20, isStullerItem: true }] });
        expect(item).toMatchObject({ name: 'Stock', price: 20, isStullerItem: true, type: 'Material' });
    });

    it('is an empty list for a ticket with no lines, or no ticket', () => {
        expect(buildWorkItems({})).toEqual([]);
        expect(buildWorkItems(null)).toEqual([]);
    });
});

describe('getStatusColor', () => {
    it('maps the four known statuses, ignoring case', () => {
        expect(getStatusColor('COMPLETED')).toBe('success');
        expect(getStatusColor('In Progress')).toBe('info');
        expect(getStatusColor('pending')).toBe('warning');
        expect(getStatusColor('Cancelled')).toBe('error');
    });

    it('is the default chip for anything else, including no status', () => {
        expect(getStatusColor('QUALITY CONTROL')).toBe('default');
        expect(getStatusColor(undefined)).toBe('default');
    });
});

describe('money', () => {
    it('always writes two places, so a price column lines up', () => {
        // The page used to print item.price raw: $40 and $63.67 in one column, defeating the tabular
        // figures the theme sets globally on td/th.
        expect(money(40)).toBe('$40.00');
        expect(money('63.67')).toBe('$63.67');
        expect(money(0)).toBe('$0.00');
    });

    it('is $0.00 rather than $NaN for a missing or unparseable price', () => {
        expect(money(undefined)).toBe('$0.00');
        expect(money('')).toBe('$0.00');
        expect(money('n/a')).toBe('$0.00');
    });
});

describe('day', () => {
    it('keeps a calendar day on its own day', () => {
        // A promise date is stored as a bare YYYY-MM-DD. `new Date('2026-10-14')` is UTC midnight, which
        // is the evening of the 13th in Central — so the obvious formatting moved every promise and due
        // date one day earlier. Caught on screen: the record said the 14th, the page said the 13th.
        expect(day('2026-10-14')).toBe('Oct 14, 2026');
        expect(day('2026-01-01')).toBe('Jan 1, 2026');
        expect(day('2026-12-31')).toBe('Dec 31, 2026');
    });

    it('still formats a real timestamp', () => {
        const stamp = new Date(2026, 8, 28, 13, 30);
        expect(day(stamp)).toBe('Sep 28, 2026');
        expect(day(stamp.toISOString())).toBe('Sep 28, 2026');
    });

    it('is null for nothing, and passes through what it cannot read', () => {
        expect(day(null)).toBeNull();
        expect(day('')).toBeNull();
        expect(day('sometime next week')).toBe('sometime next week');
    });
});
