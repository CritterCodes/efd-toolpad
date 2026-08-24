import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Commission engine invariants (owner rulings 2026-08-20): base = pre-tax QUOTED profit,
 * trigger = paid in full, rate = the attribution SNAPSHOT, payout = a payroll laborLogs
 * entry. What these tests pin: the trigger really gates, racing triggers pay once
 * (claim-first), zero profit records $0 with no payout line, a pure custom-payment cart
 * never double-earns money the customs trigger owns, and an earned payout cannot be
 * silently voided out from under payroll.
 */

let customOrder;
let affiliate;
let progress;
let claimResults; // scripted results for the null-guarded source claim
const commissions = new Map();
const laborLogs = [];
const notifications = [];
const sourceUpdates = [];

const commissionsColMock = {
  updateOne: vi.fn(async (filter, update) => {
    const id = filter.commissionId;
    if (update.$setOnInsert) {
      if (!commissions.has(id)) commissions.set(id, { ...update.$setOnInsert });
    }
    if (update.$set && commissions.has(id)) {
      if (filter.status && commissions.get(id).status !== filter.status) return { modifiedCount: 0 };
      Object.assign(commissions.get(id), update.$set);
    }
    return { modifiedCount: 1 };
  }),
  findOne: vi.fn(async (filter) => commissions.get(filter.commissionId) || null),
  find: vi.fn(() => ({ sort: () => ({ limit: () => ({ toArray: async () => [...commissions.values()] }) }) })),
};

const sourceCol = {
  updateOne: vi.fn(async (filter, update) => {
    sourceUpdates.push({ filter, update });
    if ('affiliate.commissionId' in filter) {
      return { modifiedCount: claimResults.shift() ? 1 : 0 };
    }
    return { modifiedCount: 1 };
  }),
  find: vi.fn(() => ({ limit: () => ({ toArray: async () => [] }) })),
};

vi.mock('@/lib/database', () => ({
  db: {
    connect: vi.fn(async () => ({
      collection: (name) => (name === 'affiliateCommissions' ? commissionsColMock : sourceCol),
    })),
    dbAffiliates: vi.fn(async () => ({ findOne: async () => affiliate })),
  },
}));
vi.mock('@/app/api/custom-orders/model', () => ({
  default: {
    findById: vi.fn(async () => customOrder),
    marginFor: vi.fn(async () => ({ margin: 999.99 })), // live actuals — recorded, never the base
  },
}));
vi.mock('@/app/api/repairLaborLogs/model', () => ({
  default: { create: vi.fn(async (data) => { laborLogs.push(data); return { logID: `ll-${laborLogs.length}` }; }) },
}));
vi.mock('@/lib/notificationService', () => ({
  NotificationService: { createNotification: vi.fn(async (n) => { notifications.push(n); }) },
}));
vi.mock('@/services/customs/customInvoices.service', () => ({
  getCustomPaymentProgress: vi.fn(async () => ({ progress })),
}));

const engine = await import('@/services/affiliates/commissionEngine');

beforeEach(() => {
  commissions.clear(); laborLogs.length = 0; notifications.length = 0; sourceUpdates.length = 0;
  claimResults = [true];
  progress = { isFullyPaid: true };
  affiliate = { affiliateId: 'aff_1', code: 'shanin', userId: 'u-shanin', name: 'Shanin', commissionRate: 0.2 };
  customOrder = {
    customID: 'CO-1',
    affiliate: { affiliateId: 'aff_1', affiliateCode: 'shanin', commissionRate: 0.1, commissionId: null, attributionType: 'custom_request' },
    quote: { quoteTotal: 5000, cog: 3000, total: 5475 },
  };
});

describe('earnCustomOrderCommission', () => {
  it('pays the SNAPSHOTTED rate on pre-tax quoted profit, via a payroll entry', async () => {
    const r = await engine.earnCustomOrderCommission('CO-1');
    expect(r.earned).toBe(true);
    // profit = 5000 − 3000 = 2000 (pre-tax quoteTotal, never the tax-inclusive 5475);
    // rate = the 10% attribution snapshot, NOT the affiliate's current 20% profile rate.
    expect(r.amount).toBe(200);
    const c = commissions.get('comm-CO-1');
    expect(c.basis).toMatchObject({ revenue: 5000, cost: 3000, profit: 2000 });
    expect(c.rate).toBe(0.1);
    expect(laborLogs).toHaveLength(1);
    expect(laborLogs[0]).toMatchObject({
      primaryJewelerUserID: 'u-shanin', creditedValue: 200, creditedLaborHours: 0,
      sourceAction: 'affiliate_commission', payer: 'efd',
    });
    // The payout id is recorded on the commission — the audit link to payroll.
    expect(c.laborLogId).toBe('ll-1');
    expect(notifications).toHaveLength(1);
  });

  it('the trigger gates: not fully paid → nothing happens', async () => {
    progress = { isFullyPaid: false };
    const r = await engine.earnCustomOrderCommission('CO-1');
    expect(r.earned).toBe(false);
    expect(commissions.size).toBe(0);
    expect(laborLogs).toHaveLength(0);
  });

  it('racing triggers pay once: a lost claim does no work', async () => {
    claimResults = [false]; // another trigger stamped the order first
    const r = await engine.earnCustomOrderCommission('CO-1');
    expect(r.earned).toBe(false);
    expect(commissions.size).toBe(0);
    expect(laborLogs).toHaveLength(0);
  });

  it('zero (or negative) quoted profit records a $0 commission and writes NO payout', async () => {
    customOrder.quote = { quoteTotal: 3000, cog: 3200 };
    const r = await engine.earnCustomOrderCommission('CO-1');
    expect(r.earned).toBe(true);
    expect(r.amount).toBe(0);
    expect(commissions.get('comm-CO-1').amount).toBe(0);
    expect(laborLogs).toHaveLength(0);
  });

  it('falls back to the profile rate ONLY when no snapshot exists (pre-snapshot attributions)', async () => {
    customOrder.affiliate.commissionRate = 0;
    const r = await engine.earnCustomOrderCommission('CO-1');
    expect(r.amount).toBe(400); // 2000 × the 20% profile rate
  });

  it('a failure AFTER the claim releases it, so the sweep retries instead of never paying', async () => {
    const { default: LaborLogs } = await import('@/app/api/repairLaborLogs/model');
    LaborLogs.create.mockRejectedValueOnce(new Error('payroll write failed'));
    await expect(engine.earnCustomOrderCommission('CO-1')).rejects.toThrow('payroll write failed');
    // The order must NOT be left stamped with a commissionId and no money behind it.
    const release = sourceUpdates.at(-1);
    expect(release.update.$set['affiliate.commissionId']).toBeNull();
    expect(release.update.$set['affiliate.commissionError']).toBe('payroll write failed');
  });
});

describe('recordProductSaleCommission', () => {
  const shopOrder = () => ({
    orderId: 'ord-1',
    affiliate: { affiliateId: 'aff_1', affiliateCode: 'shanin', commissionRate: 0.1, commissionId: null },
    total: 2025.75, subtotal: 1850, tax: 175.75, customAllocations: [],
  });

  it('creates a needs-review record with revenue figures and NO payout yet', async () => {
    const r = await engine.recordProductSaleCommission(shopOrder());
    expect(r.recorded).toBe(true);
    const c = commissions.get('comm-ord-1');
    expect(c.status).toBe('needs_review');
    expect(c.basis.orderTotal).toBe(2025.75);
    expect(c.basis.taxAmount).toBe(175.75); // reads the shop's `tax` field, not `taxAmount`
    expect(laborLogs).toHaveLength(0);
  });

  it('a PURE custom-payment cart is skipped — the customs trigger owns that money', async () => {
    const order = { ...shopOrder(), total: 500, customAllocations: [{ customID: 'CO-1', amount: 500 }] };
    const r = await engine.recordProductSaleCommission(order);
    expect(r.recorded).toBe(false);
    expect(commissions.size).toBe(0);
  });

  it('approval computes amount at the snapshotted rate and writes the payout', async () => {
    await engine.recordProductSaleCommission(shopOrder());
    const r = await engine.approveCommission({ commissionId: 'comm-ord-1', profit: 600, approvedBy: 'admin' });
    expect(r.amount).toBe(60); // 600 × 10% snapshot, not the 20% profile
    expect(commissions.get('comm-ord-1').status).toBe('earned');
    expect(laborLogs).toHaveLength(1);
    expect(laborLogs[0].creditedValue).toBe(60);
  });

  it('an earned commission with a payroll entry REFUSES to void silently', async () => {
    await engine.recordProductSaleCommission(shopOrder());
    await engine.approveCommission({ commissionId: 'comm-ord-1', profit: 600, approvedBy: 'admin' });
    await expect(engine.voidCommission({ commissionId: 'comm-ord-1', voidedBy: 'admin' }))
      .rejects.toThrow(/payroll/i);
  });

  it('a needs-review commission voids cleanly', async () => {
    await engine.recordProductSaleCommission(shopOrder());
    const r = await engine.voidCommission({ commissionId: 'comm-ord-1', reason: 'refund', voidedBy: 'admin' });
    expect(r.status).toBe('void');
    expect(commissions.get('comm-ord-1').status).toBe('void');
  });
});
