import { describe, it, expect } from 'vitest';
import { buildGuideTerms, buildChecklist, profileIsComplete } from './guideTerms';

const PROD_LIKE = {
  pricing: { wage: 50, administrativeFee: 0.25, businessFee: 0.5, consumablesFee: 0.25, wholesaleMarkup: 1.2, taxRate: 0.095, deliveryFee: 5 },
  financial: {},
};

describe('buildGuideTerms', () => {
  it('derives every number from settings — prod shape gives 2.0× retail and 1.2× wholesale', () => {
    const t = buildGuideTerms({ settings: PROD_LIKE });
    expect(t.labor.wage).toBe(50);
    expect(t.labor.businessMultiplier).toBe(2);
    expect(t.labor.wholesaleMarkup).toBe(1.2);
    expect(t.labor.efdRetailShare).toBe(0.5);
    expect(t.labor.efdWholesaleShare).toBeCloseTo(0.1667, 3);
    expect(t.workOrders.markup).toBe(1.2);
    expect(t.workOrders.castingAtCost).toBe(true);
    expect(t.sales.consignment).toBe(0.2);
    expect(t.sales.marketplace).toBe(0.15);
    expect(t.wholesale.taxRate).toBe(0.095);
    expect(t.wholesale.deliveryFee).toBe(5);
    expect(t.payroll.dailyFeeLabel).toMatch(/\$1\.25/);
    expect(t.payroll.onlyPath).toBe(true);
  });

  it('uses documented defaults when a setting is absent, and the live value when present', () => {
    const d = buildGuideTerms({ settings: PROD_LIKE });
    expect(d.workOrders.clientMgmtBonusPct).toBe(0.05);
    expect(d.workOrders.qcReviewFee).toBe(25);
    expect(d.affiliate.rate).toBe(0.1);
    expect(d.affiliate.rateIsDefault).toBe(true);
    const l = buildGuideTerms({
      settings: { ...PROD_LIKE, financial: { clientMgmtBonusPct: 0.08, qcReviewFee: 40 }, pricing: { ...PROD_LIKE.pricing, consignmentFeeRate: 0.25 } },
      affiliate: { commissionRate: 0.12 },
    });
    expect(l.workOrders.clientMgmtBonusPct).toBe(0.08);
    expect(l.workOrders.qcReviewFee).toBe(40);
    expect(l.sales.consignment).toBe(0.25);
    expect(l.affiliate.rate).toBe(0.12);
    expect(l.affiliate.rateIsDefault).toBe(false);
  });

  it('never crashes on empty settings', () => {
    const t = buildGuideTerms({});
    expect(t.labor.businessMultiplier).toBeGreaterThanOrEqual(2);
    expect(t.labor.wholesaleMarkup).toBe(1.5);
  });
});

describe('buildChecklist', () => {
  it('artisan: terms → profile → Stripe → guide, done flags from facts', () => {
    const items = buildChecklist({ role: 'artisan', facts: { termsAccepted: true, profileComplete: false, connectLive: false, connectStarted: true } });
    expect(items.map((i) => i.id)).toEqual(['terms', 'profile', 'connect-stripe', 'read-guide']);
    expect(items[0].done).toBe(true);
    expect(items[1].done).toBe(false);
    expect(items[2].cta).toBe('Finish Stripe setup');
    expect(items[2].href).toBe('/dashboard/artisan/payroll');
  });

  it('affiliate: code → Stripe → guide, Stripe link goes to the affiliate payouts page', () => {
    const items = buildChecklist({ role: 'affiliate', facts: { affiliateCode: 'KIRA', connectLive: true } });
    expect(items.map((i) => i.id)).toEqual(['affiliate-code', 'connect-stripe', 'read-guide']);
    expect(items[0].done).toBe(true);
    expect(items[1].done).toBe(true);
    expect(items[1].href).toBe('/dashboard/affiliate/payouts');
  });

  it('wholesaler: settings → first repair → guide', () => {
    const items = buildChecklist({ role: 'wholesaler', facts: { storeSettingsComplete: true, storeRepairsCount: 0 } });
    expect(items.map((i) => i.id)).toEqual(['store-settings', 'first-repair', 'read-guide']);
    expect(items[1].done).toBe(false);
  });

  it('admin: shop setup items', () => {
    const items = buildChecklist({ role: 'admin', facts: { stripeConfigured: true, connectLive: false, qcModeSet: true, payoutFeesSet: false, fundingSet: true } });
    expect(items.map((i) => i.id)).toEqual(['stripe-configured', 'connect-stripe', 'qc-mode', 'payout-fees']);
    expect(items[3].done).toBe(false);
  });
});

describe('profileIsComplete', () => {
  it('needs a business name, an about, and a photo', () => {
    expect(profileIsComplete({ artisanApplication: { businessName: 'A', about: 'b', profileImageUrl: 'x' } })).toBe(true);
    expect(profileIsComplete({ artisanApplication: { businessName: 'A', about: 'b' } })).toBe(false);
    expect(profileIsComplete({ artisanApplication: { businessName: 'A', profileImageUrl: 'x' } })).toBe(false);
    expect(profileIsComplete({})).toBe(false);
  });
});
