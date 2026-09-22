import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/database', () => ({ db: { connect: vi.fn() } }));
vi.mock('@/app/api/repairLaborLogs/model', () => ({ default: { buildUnbatchedMatch: vi.fn(() => ({})), assignToPayrollBatch: vi.fn() } }));
vi.mock('@/app/api/salePayouts/model', () => ({ default: { assignToPayrollBatch: vi.fn() } }));
vi.mock('@/app/api/repairPayrollBatches/model', () => ({ default: { create: vi.fn(), findOpenByUserWeek: vi.fn() } }));
vi.mock('@/app/api/repairs/payroll/service', () => ({ getOwnerOperatorUserIDs: vi.fn(async () => []), finalizePayrollBatch: vi.fn() }));

import { computeDailyPayout, dailyFeeLabel, normalizeFeeSettings, normalizeCadence, startOfDay, FEE_DEFAULTS } from './payoutCadence';

describe('daily payout fee (pure)', () => {
  it('weekly is not touched here; daily nets Stripe + EFD flat out of the transfer, exactly', () => {
    const p = computeDailyPayout({ gross: 100 });
    // net = (100 - 0.25 - 1) / 1.0025 = 98.50 (rounded); Stripe fee on the net = 0.25 + 0.2463 → 0.50
    expect(p.net).toBe(98.5);
    expect(p.efdFee).toBe(1);
    expect(p.stripeFee).toBe(0.5);
    expect(p.fee).toBe(1.5);
    expect(p.gross + 0).toBe(100);
    expect(p.net + p.fee).toBe(100);
  });

  it('owner-operators skip the EFD fee but still cover Stripe', () => {
    const p = computeDailyPayout({ gross: 100, ownerOperator: true });
    expect(p.efdFee).toBe(0);
    expect(p.net).toBe(99.5);
    expect(p.stripeFee).toBe(0.5);
  });

  it('a day too small to cover the fees nets zero and charges nothing', () => {
    const p = computeDailyPayout({ gross: 1 });
    expect(p).toMatchObject({ gross: 1, net: 0, efdFee: 0, stripeFee: 0, fee: 1 });
  });

  it('rates are settings with sane clamps and a readable label', () => {
    expect(normalizeFeeSettings(undefined)).toEqual({ ...FEE_DEFAULTS });
    expect(normalizeFeeSettings({ stripeFlat: -1, stripePct: 99, dailyFlat: 'x' })).toEqual({ stripeFlat: 0.25, stripePct: 10, dailyFlat: 1 });
    expect(dailyFeeLabel()).toBe('$1.25 + 0.25% per payout');
    expect(dailyFeeLabel({ stripeFlat: 0.25, stripePct: 0.25, dailyFlat: 0.5 })).toBe('$0.75 + 0.25% per payout');
  });

  it('cadence defaults to weekly; days start at local midnight', () => {
    expect(normalizeCadence('daily')).toBe('daily');
    expect(normalizeCadence('hourly')).toBe('weekly');
    expect(normalizeCadence(undefined)).toBe('weekly');
    const d = startOfDay(new Date('2026-09-22T15:45:00'));
    expect(d.getHours()).toBe(0);
    expect(d.getDate()).toBe(22);
  });
});
