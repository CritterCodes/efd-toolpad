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

let pendingCustomOrders = [];
let pendingShopOrders = [];
let laborLogDocs = [];

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

// One mock stands in for both source collections; `find` is scripted per collection
// name so the pending-work queries can return different fixtures.
let currentCollection = null;
const sourceCol = {
  updateOne: vi.fn(async (filter, update) => {
    sourceUpdates.push({ filter, update });
    if ('affiliate.commissionId' in filter) {
      return { modifiedCount: claimResults.shift() ? 1 : 0 };
    }
    return { modifiedCount: 1 };
  }),
  find: vi.fn(function findImpl() {
    const rows = currentCollection === 'customOrders' ? pendingCustomOrders
      : currentCollection === 'orders' ? pendingShopOrders
        : currentCollection === 'laborLogs' ? laborLogDocs : [];
    const chain = {
      sort: () => chain,
      limit: () => chain,
      toArray: async () => rows,
    };
    return chain;
  }),
};

vi.mock('@/lib/database', () => ({
  db: {
    connect: vi.fn(async () => ({
      collection: (name) => {
        currentCollection = name;
        return name === 'affiliateCommissions' ? commissionsColMock : sourceCol;
      },
    })),
    dbAffiliates: vi.fn(async () => ({ findOne: async () => affiliate })),
    dbLaborLogs: vi.fn(async () => {
      currentCollection = 'laborLogs';
      return sourceCol;
    }),
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
  pendingCustomOrders = []; pendingShopOrders = []; laborLogDocs = []; currentCollection = null;
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
  // 'paid' is the CART/RTS terminal state; MTO uses 'accepted' (see COMMISSIONABLE_ORDER_STATUSES).
  const shopOrder = (over = {}) => ({
    orderId: 'ord-1',
    kind: 'cart',
    fulfillmentStatus: 'paid',
    affiliate: { affiliateId: 'aff_1', affiliateCode: 'shanin', commissionRate: 0.1, commissionId: null },
    total: 2025.75, subtotal: 1850, tax: 175.75, customAllocations: [],
    ...over,
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
    const order = shopOrder({ total: 500, customAllocations: [{ customID: 'CO-1', amount: 500 }] });
    const r = await engine.recordProductSaleCommission(order);
    expect(r.recorded).toBe(false);
    expect(commissions.size).toBe(0);
  });

  // THE MTO BUG (fixed 2026-08-25): made-to-order sales settle as 'accepted', never
  // 'paid'. The sweep filtered on 'paid' alone, so every MTO sale was attributed and
  // converted on the affiliate's dashboard but silently never commissioned.
  it('an ACCEPTED made-to-order sale earns — it is the MTO equivalent of paid', async () => {
    const r = await engine.recordProductSaleCommission(
      shopOrder({ orderId: 'ord-mto', kind: 'made_to_order', fulfillmentStatus: 'accepted' }),
    );
    expect(r.recorded).toBe(true);
    expect(commissions.get('comm-ord-mto').status).toBe('needs_review');
  });

  it.each([
    ['awaiting_payment',        'never charged'],
    ['payment_setup_failed',    'never charged'],
    ['rejected_capacity',       'charged but the edition was full — refund owed'],
    ['cancelled_pre_production','was accepted (so it carries paidAt) then cancelled'],
  ])('does NOT commission a %s order (%s)', async (fulfillmentStatus) => {
    const r = await engine.recordProductSaleCommission(
      shopOrder({ orderId: `ord-${fulfillmentStatus}`, fulfillmentStatus }),
    );
    expect(r.recorded).toBe(false);
    expect(commissions.size).toBe(0);
  });

  it('estimates pending custom work, and refuses to estimate a product sale', async () => {
    pendingCustomOrders = [
      { customID: 'CO-p1', title: 'Signet', status: 'in_production', quote: { quoteTotal: 5000, cog: 3000 }, affiliate: { commissionRate: 0.1 }, createdAt: new Date('2026-08-02') },
      { customID: 'CO-dead', title: 'Abandoned', status: 'cancelled', quote: { quoteTotal: 1000, cog: 400 }, affiliate: { commissionRate: 0.1 }, createdAt: new Date('2026-08-01') },
    ];
    pendingShopOrders = [
      { orderId: 'ord-p1', kind: 'made_to_order', fulfillmentStatus: 'accepted', affiliate: { commissionRate: 0.1 }, createdAt: new Date('2026-08-03') },
    ];
    const p = await engine.listPendingWork('aff_1');

    const custom = p.rows.find((r) => r.sourceID === 'CO-p1');
    expect(custom.estimate).toBe(200); // (5000 − 3000) × 10%, pre-tax profit
    // A product sale's profit isn't derivable, so no invented number.
    expect(p.rows.find((r) => r.sourceID === 'ord-p1').estimate).toBeNull();
    // Cancelled work is still SHOWN (so it isn't a mystery) but flagged...
    expect(p.rows.find((r) => r.sourceID === 'CO-dead').willNeverPay).toBe(true);
    // ...and kept out of both the count and the headline estimate: a total is only
    // useful if every dollar in it can actually arrive. 200, not 260.
    expect(p.count).toBe(2);
    expect(p.estimatedTotal).toBe(200);
  });

  it('surfaces payroll state so "earned" and "actually paid" are distinguishable', async () => {
    commissions.set('comm-a', { commissionId: 'comm-a', affiliateId: 'aff_1', status: 'earned', amount: 300, laborLogId: 'll-1' });
    commissions.set('comm-b', { commissionId: 'comm-b', affiliateId: 'aff_1', status: 'earned', amount: 150, laborLogId: 'll-2' });
    laborLogDocs = [
      { logID: 'll-1', payrollStatus: 'paid', payrolledAt: new Date('2026-08-10') },
      { logID: 'll-2', payrollStatus: 'unbatched', payrolledAt: null },
    ];
    const { commissions: rows, totals } = await engine.listCommissions('aff_1');
    expect(rows.find((r) => r.commissionId === 'comm-a').payrollStatus).toBe('paid');
    expect(rows.find((r) => r.commissionId === 'comm-b').payrollStatus).toBe('unbatched');
    expect(totals.earned).toBe(450);
    expect(totals.paidOut).toBe(300);
    expect(totals.awaitingPayroll).toBe(150);
  });

  it('notifies a conversion exactly once, claim-first', async () => {
    pendingCustomOrders = [{ customID: 'CO-new', affiliate: { affiliateId: 'aff_1' } }];
    pendingShopOrders = [];
    const first = await engine.notifyNewConversions();
    expect(first.notified).toBe(1);
    expect(notifications[0].type).toBe('affiliate-referral-converted');
    // The claim stamps conversionNotifiedAt; a losing claim notifies nobody.
    const stamped = sourceUpdates.find((u) => u.update.$set?.['affiliate.conversionNotifiedAt']);
    expect(stamped).toBeTruthy();
  });

  it('the sweep asks for BOTH terminal states, so neither kind is left behind', async () => {
    expect(engine.COMMISSIONABLE_ORDER_STATUSES).toEqual(['paid', 'accepted']);
    sourceCol.find.mockClear();
    await engine.drainCommissions();
    // Second find() is the shop-orders sweep (the first is customOrders).
    const ordersQuery = sourceCol.find.mock.calls[1][0];
    expect(ordersQuery.fulfillmentStatus).toEqual({ $in: ['paid', 'accepted'] });
    expect(ordersQuery['affiliate.commissionId']).toBeNull();
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
