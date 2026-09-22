import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/database', () => ({ db: { connect: vi.fn() } }));

import { normalizeFeeSchedule, normalizeCustomFees, customFeesFromSettings, CUSTOM_FEE_DEFAULTS } from './feeSettings';
import { loadFeeSchedule } from './feeSchedule';

describe('normalizeFeeSchedule (pure)', () => {
  it('defaults every missing rate and rounds', () => {
    expect(normalizeFeeSchedule({})).toEqual({ consignment: 0.2, marketplace: 0.15, pillars: { storefront: 0.15, custody: 0.03, fulfillment: 0.02 } });
    expect(normalizeFeeSchedule({ consignment: '0.25', pillars: { custody: 0.04 } }).consignment).toBe(0.25);
    expect(normalizeFeeSchedule({ pillars: { custody: 0.04 } }).pillars).toEqual({ storefront: 0.15, custody: 0.04, fulfillment: 0.02 });
  });
  it('rejects rates outside 0–1 and pillars that add past 100%', () => {
    expect(() => normalizeFeeSchedule({ consignment: 1.5 })).toThrow(/Consignment rate/);
    expect(() => normalizeFeeSchedule({ marketplace: -0.1 })).toThrow(/Marketplace/);
    expect(() => normalizeFeeSchedule({ pillars: { storefront: 0.6, custody: 0.3, fulfillment: 0.2 } })).toThrow(/more than 100%/);
  });
  it('what it writes is what loadFeeSchedule reads back (both the block and the legacy flat rate)', () => {
    const next = normalizeFeeSchedule({ consignment: 0.22, marketplace: 0.12 });
    const doc = { pricing: { feeSchedule: next, consignmentFeeRate: next.consignment } };
    expect(loadFeeSchedule(doc)).toEqual({ consignment: 0.22, marketplace: 0.12, pillars: { storefront: 0.15, custody: 0.03, fulfillment: 0.02 } });
  });
});

describe('custom fees (pure)', () => {
  it('normalizes and defaults', () => {
    expect(normalizeCustomFees({})).toEqual({ clientMgmtBonusPct: 0.05, qcReviewFee: 25 });
    expect(normalizeCustomFees({ clientMgmtBonusPct: '0.08', qcReviewFee: '40.5' })).toEqual({ clientMgmtBonusPct: 0.08, qcReviewFee: 40.5 });
    expect(() => normalizeCustomFees({ clientMgmtBonusPct: 2 })).toThrow(/Client-management bonus/);
    expect(() => normalizeCustomFees({ qcReviewFee: -1 })).toThrow(/QC review fee/);
  });
  it('reads a settings doc the same way the customs code does (financial.*, defaults when absent)', () => {
    expect(customFeesFromSettings({})).toEqual(CUSTOM_FEE_DEFAULTS);
    expect(customFeesFromSettings({ financial: { clientMgmtBonusPct: 0, qcReviewFee: 30 } })).toEqual({ clientMgmtBonusPct: 0, qcReviewFee: 30 });
    expect(customFeesFromSettings({ financial: { qcReviewFee: 0 } }).qcReviewFee).toBe(25); // 0 falls back, matching pieceWorkOrderActions
  });
});
