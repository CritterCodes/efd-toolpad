import { describe, expect, it } from 'vitest';
import { computePieceCosts } from '@/services/production/pieceCost';

describe('computePieceCosts', () => {
  it('sums materials (unitCost × qty) and labor (creditedValue)', () => {
    const r = computePieceCosts({
      actualMaterials: [
        { unitCost: 120, qty: 1 },   // 120 (casting)
        { unitCost: 50, qty: 3 },    // 150 (stones)
      ],
      laborLogs: [
        { creditedValue: 80 },       // setting
        { creditedValue: 45 },       // polish
      ],
    });
    expect(r.accruedMaterialCost).toBeCloseTo(270, 2);
    expect(r.accruedLaborCost).toBeCloseTo(125, 2);
    expect(r.totalCOGS).toBeCloseTo(395, 2);
  });

  it('defaults qty to 1 and ignores missing values', () => {
    const r = computePieceCosts({ actualMaterials: [{ unitCost: 30 }], laborLogs: [{}] });
    expect(r.accruedMaterialCost).toBeCloseTo(30, 2);
    expect(r.accruedLaborCost).toBe(0);
    expect(r.totalCOGS).toBeCloseTo(30, 2);
  });

  it('returns zeros for an empty piece', () => {
    const r = computePieceCosts({});
    expect(r).toEqual({ accruedMaterialCost: 0, accruedLaborCost: 0, totalCOGS: 0 });
  });
});
