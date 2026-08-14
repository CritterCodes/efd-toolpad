import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Status automation invariants. The lifecycle hooks (quote publish, payments, casting,
 * bench QC) all advance through advanceCustomOrderStatus, so what these tests pin down
 * is the safety contract: forward-only (automation can never demote a human's decision
 * or resurrect a cancelled order), the completed-bonus fires on EVERY path into
 * completed, and "all work orders done" cannot complete an order that is still in the
 * design phase — where the lone CAD work order makes that trivially, wrongly true.
 */

let order;
let workOrders;
const updates = [];
const notifications = [];
const bonusCalls = [];

vi.mock('@/app/api/custom-orders/model', () => ({
  CUSTOM_ORDER_STATUS: {
    PENDING: 'pending', CONSULTATION: 'consultation', DESIGN: 'design', QUOTE: 'quote',
    DEPOSIT: 'deposit', IN_PRODUCTION: 'in_production', QC: 'qc', COMPLETED: 'completed',
    DELIVERED: 'delivered', CANCELLED: 'cancelled',
  },
  default: {
    findById: vi.fn(async () => order),
    updateById: vi.fn(async (_id, fields, meta) => {
      updates.push({ fields, meta });
      order = { ...order, ...fields };
      return order;
    }),
  },
}));
vi.mock('@/lib/notificationService', () => ({
  NotificationService: { createNotification: vi.fn(async (n) => { notifications.push(n); }) },
}));
vi.mock('@/lib/appUrls', () => ({ portalLink: (id, tab) => `https://shop.test/portal/${id}/${tab}` }));
vi.mock('@/services/workOrders/disciplines', () => ({ DISCIPLINE: { CAD: 'cad', BENCH_JEWELRY: 'bench_jewelry' } }));
vi.mock('@/services/customs/customProduction', () => ({
  awardClientMgmtBonus: vi.fn(async (args) => { bonusCalls.push(args); return null; }),
  getCustomWorkOrders: vi.fn(async () => workOrders),
}));

const { advanceCustomOrderStatus, maybeCompleteCustomOrder } = await import('@/services/customs/customStatus');

beforeEach(() => {
  updates.length = 0;
  notifications.length = 0;
  bonusCalls.length = 0;
  workOrders = [];
  order = {
    customID: 'CO-test-1', status: 'pending', clientID: 'client-1',
    customerEmail: 'client@test.dev', quote: {},
  };
});

describe('advanceCustomOrderStatus', () => {
  it('advances forward and stamps the system audit trail', async () => {
    const r = await advanceCustomOrderStatus('CO-test-1', 'quote', { reason: 'quote published' });
    expect(r.advanced).toBe(true);
    expect(updates).toHaveLength(1);
    expect(updates[0].fields.status).toBe('quote');
    expect(updates[0].meta).toEqual({ changedBy: 'system', reason: 'quote published' });
  });

  it('never demotes: a later status ignores an earlier-stage event', async () => {
    order.status = 'in_production';
    const r = await advanceCustomOrderStatus('CO-test-1', 'quote', { reason: 're-published' });
    expect(r.advanced).toBe(false);
    expect(updates).toHaveLength(0);
  });

  it('a same-status event is a no-op (stale replays are safe)', async () => {
    order.status = 'deposit';
    const r = await advanceCustomOrderStatus('CO-test-1', 'deposit', { reason: 'payment 30%' });
    expect(r.advanced).toBe(false);
    expect(updates).toHaveLength(0);
  });

  it('never resurrects a cancelled order', async () => {
    order.status = 'cancelled';
    const r = await advanceCustomOrderStatus('CO-test-1', 'in_production', { reason: 'casting received' });
    expect(r.advanced).toBe(false);
    expect(updates).toHaveLength(0);
  });

  it('fires the milestone notification for mapped statuses', async () => {
    order.status = 'deposit';
    await advanceCustomOrderStatus('CO-test-1', 'in_production', { reason: 'payment 50%' });
    expect(notifications).toHaveLength(1);
    expect(notifications[0].type).toBe('custom-status-in_production');
    expect(notifications[0].userId).toBe('client-1');
  });

  it('sends no milestone for unmapped statuses (quote/deposit have richer notifications)', async () => {
    await advanceCustomOrderStatus('CO-test-1', 'quote', { reason: 'quote published' });
    expect(notifications).toHaveLength(0);
  });

  it('awards the client-management bonus on EVERY path into completed', async () => {
    order.status = 'qc';
    await advanceCustomOrderStatus('CO-test-1', 'completed', { reason: 'all work orders completed' });
    expect(bonusCalls).toEqual([{ customID: 'CO-test-1' }]);
  });

  it('does not award the bonus on non-completed advances', async () => {
    await advanceCustomOrderStatus('CO-test-1', 'design', { reason: 'CAD work order created' });
    expect(bonusCalls).toHaveLength(0);
  });
});

describe('maybeCompleteCustomOrder', () => {
  const cadDone = { workOrderID: 'wo-cad', discipline: 'cad', status: 'COMPLETED' };
  const benchDone = { workOrderID: 'wo-bench', discipline: 'bench_jewelry', status: 'COMPLETED' };
  const benchOpen = { workOrderID: 'wo-bench2', discipline: 'bench_jewelry', status: 'IN PROGRESS' };

  it('THE DESIGN-PHASE GUARD: a lone completed CAD WO does not complete the order', async () => {
    order.status = 'design';
    workOrders = [cadDone];
    const r = await maybeCompleteCustomOrder('CO-test-1');
    expect(r.advanced).toBe(false);
    expect(updates).toHaveLength(0);
  });

  it('completes once casting is in hand and every WO is terminal with bench work done', async () => {
    order.status = 'in_production';
    order.castingReceivedAt = new Date();
    workOrders = [cadDone, benchDone];
    const r = await maybeCompleteCustomOrder('CO-test-1');
    expect(r.advanced).toBe(true);
    expect(order.status).toBe('completed');
    expect(bonusCalls).toHaveLength(1);
  });

  it('waits while any work order is still open', async () => {
    order.status = 'in_production';
    order.castingReceivedAt = new Date();
    workOrders = [cadDone, benchDone, benchOpen];
    const r = await maybeCompleteCustomOrder('CO-test-1');
    expect(r.advanced).toBe(false);
  });

  it('requires actual bench work — all-CAD completion is not a finished piece', async () => {
    order.status = 'in_production';
    order.castingReceivedAt = new Date();
    workOrders = [cadDone];
    const r = await maybeCompleteCustomOrder('CO-test-1');
    expect(r.advanced).toBe(false);
  });

  it('treats a cancelled WO as terminal so it cannot strand completion', async () => {
    order.status = 'in_production';
    order.castingReceivedAt = new Date();
    workOrders = [cadDone, benchDone, { workOrderID: 'wo-x', discipline: 'bench_jewelry', status: 'CANCELLED' }];
    const r = await maybeCompleteCustomOrder('CO-test-1');
    expect(r.advanced).toBe(true);
  });

  it('no-ops on an order already completed or delivered', async () => {
    order.status = 'delivered';
    workOrders = [cadDone, benchDone];
    const r = await maybeCompleteCustomOrder('CO-test-1');
    expect(r.advanced).toBe(false);
    expect(updates).toHaveLength(0);
  });
});
