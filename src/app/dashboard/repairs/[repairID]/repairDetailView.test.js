import { describe, it, expect } from 'vitest';
import { calculateDisplayedRepairTotal, buildWorkItems, getStatusColor } from './repairDetailView';

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
