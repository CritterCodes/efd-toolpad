import { computeMargin, computeSalePrice, computeLaborCost, clampMarkup } from './productEditorUtils';

describe('computeMargin', () => {
    it('returns correct percentage margin', () => {
        expect(computeMargin(100, 60)).toBeCloseTo(40);
    });

    it('returns 0 when salePrice is 0', () => {
        expect(computeMargin(0, 60)).toBe(0);
    });

    it('returns 0 when salePrice is negative', () => {
        expect(computeMargin(-10, 60)).toBe(0);
    });

    it('handles zero cost basis', () => {
        expect(computeMargin(100, 0)).toBeCloseTo(100);
    });

    it('handles string inputs', () => {
        expect(computeMargin('200', '100')).toBeCloseTo(50);
    });
});

describe('computeSalePrice', () => {
    it('computes correctly with markup', () => {
        expect(computeSalePrice(100, 50, 100)).toBeCloseTo(300);
    });

    it('returns cost + labor at zero markup', () => {
        expect(computeSalePrice(80, 20, 0)).toBeCloseTo(100);
    });

    it('handles all zeros', () => {
        expect(computeSalePrice(0, 0, 0)).toBe(0);
    });

    it('handles string inputs', () => {
        expect(computeSalePrice('50', '10', '50')).toBeCloseTo(90);
    });
});

describe('computeLaborCost', () => {
    it('multiplies hours by rate', () => {
        expect(computeLaborCost(3, 25)).toBe(75);
    });

    it('returns 0 for zero hours', () => {
        expect(computeLaborCost(0, 50)).toBe(0);
    });

    it('returns 0 for zero rate', () => {
        expect(computeLaborCost(5, 0)).toBe(0);
    });

    it('handles string inputs', () => {
        expect(computeLaborCost('2', '30')).toBe(60);
    });
});

describe('clampMarkup', () => {
    it('returns value within range unchanged', () => {
        expect(clampMarkup(100)).toBe(100);
    });

    it('clamps below 0 to 0', () => {
        expect(clampMarkup(-10)).toBe(0);
    });

    it('clamps above 500 to 500', () => {
        expect(clampMarkup(999)).toBe(500);
    });

    it('handles boundary value 0', () => {
        expect(clampMarkup(0)).toBe(0);
    });

    it('handles boundary value 500', () => {
        expect(clampMarkup(500)).toBe(500);
    });
});
