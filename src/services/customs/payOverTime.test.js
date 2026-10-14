import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/database', () => ({ db: {} }));
vi.mock('@/app/api/custom-orders/model', () => ({ default: {} }));
vi.mock('@/app/api/custom-orders/invoices/model', () => ({ default: {} }));
vi.mock('@/lib/notificationService', () => ({ NotificationService: {}, notifyAllAdmins: vi.fn() }));
vi.mock('@/lib/appUrls', () => ({ portalLink: () => '', adminLink: () => '' }));

const { paidGateConflict, priceEntry, stoneCheckDue, choresFor } = await import('@/services/customs/payOverTime');

const gates = [
  { n: 1, name: 'Stone', amount: 1300 },
  { n: 2, name: 'Mounting', amount: 900 },
  { n: 3, name: 'Production', amount: 500 },
  { n: 4, name: 'Balance', amount: 200 },
];
const withMounting = (amount) => gates.map((g) => (g.n === 2 ? { ...g, amount } : g));

/** A stage the customer has paid for never changes price (PAY_OVER_TIME_CONTRACT §6). */
describe('paidGateConflict', () => {
  it('lets an unpaid stage move', () => {
    expect(paidGateConflict(gates, withMounting(990), 1300)).toBe(null);
  });
  it('refuses to move a paid stage', () => {
    expect(paidGateConflict(gates, withMounting(990), 2200)?.name).toBe('Mounting');
  });
  it('refuses to drop a paid stage', () => {
    expect(paidGateConflict(gates, gates.filter((g) => g.n !== 1), 1300)?.name).toBe('Stone');
  });
  it('nothing is locked before any payment', () => {
    expect(paidGateConflict(gates, withMounting(1), 0)).toBe(null);
  });
});

describe('priceEntry', () => {
  it('records the mounting stage and totals, rounded', () => {
    const e = priceEntry({ gates, quoteTotal: 2700, taxAmount: 200.004, total: 2900.004, mounting: { metal: { pricePerGram: 61.2 } } }, 'metal-market', new Date('2026-10-14'));
    expect(e).toMatchObject({ reason: 'metal-market', mountingGate: 900, taxAmount: 200, total: 2900, pricePerGram: 61.2 });
  });
});

describe('stoneCheckDue', () => {
  const now = new Date('2026-10-20T12:00:00Z');
  const base = {
    status: 'deposit',
    payment: { path: 'over-time' },
    quote: { quotePublished: true, acceptedAt: '2026-10-14', centerstone: { item: 'sapphire', cost: 900 } },
  };
  it('is due when never checked', () => expect(stoneCheckDue(base, {}, now)).toBe(true));
  it('is not due within 7 days of the last check', () => {
    expect(stoneCheckDue({ ...base, stoneCheck: { checkedAt: '2026-10-15T12:00:00Z', status: 'available' } }, {}, now)).toBe(false);
  });
  it('is due again after 7 days', () => {
    expect(stoneCheckDue({ ...base, stoneCheck: { checkedAt: '2026-10-13T12:00:00Z', status: 'available' } }, {}, now)).toBe(true);
  });
  it('stops once the stone stage is paid, the stone is bought, or there is no stone', () => {
    expect(stoneCheckDue(base, { stoneGatePaid: true }, now)).toBe(false);
    expect(stoneCheckDue({ ...base, stoneCheck: { status: 'purchased', checkedAt: '2026-01-01' } }, {}, now)).toBe(false);
    expect(stoneCheckDue({ ...base, quote: { ...base.quote, centerstone: { item: '', cost: 0 } } }, {}, now)).toBe(false);
  });
  it('only applies to open, accepted, pay-over-time orders', () => {
    expect(stoneCheckDue({ ...base, payment: { path: 'deposit' } }, {}, now)).toBe(false);
    expect(stoneCheckDue({ ...base, status: 'cancelled' }, {}, now)).toBe(false);
    expect(stoneCheckDue({ ...base, quote: { ...base.quote, acceptedAt: null } }, {}, now)).toBe(false);
  });
});

describe('choresFor', () => {
  const order = { status: 'deposit', payment: { path: 'over-time' }, quote: { centerstone: { item: 'sapphire', cost: 900 }, mounting: { cost: 400, metal: { pricePerGram: 60 } } } };
  const keys = (d) => choresFor(d).map((c) => c.key);
  const ok = { progress: { readyForProduction: false }, ladder: {}, clock: { overdue: false }, stoneDue: false };

  it('nothing to do', () => expect(keys({ order, ...ok })).toEqual([]));
  it('overdue comes first', () => expect(keys({ order, ...ok, clock: { overdue: true, dueBy: new Date() }, stoneDue: true })).toEqual(['overdue', 'check-stone']));
  it('a paid stone stage means buy the stone, until it is marked bought', () => {
    expect(keys({ order, ...ok, ladder: { stoneGatePaid: true } })).toEqual(['buy-stone']);
    expect(keys({ order: { ...order, stoneCheck: { status: 'purchased' } }, ...ok, ladder: { stoneGatePaid: true } })).toEqual([]);
  });
  it('a sold stone needs replacing rather than checking', () => {
    expect(keys({ order: { ...order, stoneCheck: { status: 'sold' } }, ...ok, stoneDue: true })).toEqual(['replace-stone']);
  });
  it('production paid on an order still in deposit means start production', () => {
    expect(keys({ order, ...ok, progress: { readyForProduction: true } })).toEqual(['start-production']);
  });
  it('a hand-typed mounting is flagged because it cannot follow the market', () => {
    expect(keys({ order: { ...order, quote: { ...order.quote, mounting: { cost: 400 } } }, ...ok })).toEqual(['no-metal-snapshot']);
  });
});
