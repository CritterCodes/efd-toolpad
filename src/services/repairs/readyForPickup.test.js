import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  updateById: vi.fn(async () => ({})),
  findByInvoiceID: vi.fn(),
  updateByInvoiceID: vi.fn(async () => ({})),
  createNotification: vi.fn(async () => ({})),
  usersFindOne: vi.fn(),
}));

vi.mock('@/app/api/repairs/model', () => ({ default: { findById: mocks.findById, updateById: mocks.updateById } }));
vi.mock('@/app/api/repair-invoices/model', () => ({ default: { findByInvoiceID: mocks.findByInvoiceID, updateByInvoiceID: mocks.updateByInvoiceID } }));
vi.mock('@/lib/notificationService', () => ({ NotificationService: { createNotification: mocks.createNotification } }));
vi.mock('@/lib/database', () => ({ db: { connect: async () => ({ collection: () => ({ findOne: mocks.usersFindOne }) }) } }));

const { isRetailCustomerRepair, newPayToken, payLinkFor, buildReadyMessage, notifyReadyForPickup } = await import('./readyForPickup');

const retailRepair = { repairID: 'r1', userID: '6a32c80fe4c4c45af4a462ba', clientName: 'Caroline Sullivan', billing: { mode: 'retail' }, isWholesale: false, invoiceID: 'rinv-1' };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.findById.mockResolvedValue({ ...retailRepair });
  mocks.findByInvoiceID.mockResolvedValue({ invoiceID: 'rinv-1', repairIDs: ['r1'], paymentStatus: 'unpaid', remainingBalance: 43.8 });
  mocks.usersFindOne.mockResolvedValue({ _id: 'oid', userID: 'user-c1', email: 'caroline@example.com', firstName: 'Caroline' });
});

describe('isRetailCustomerRepair (pure)', () => {
  it('retail and charged → yes; wholesale, comped, internal → no', () => {
    expect(isRetailCustomerRepair(retailRepair)).toBe(true);
    expect(isRetailCustomerRepair({ ...retailRepair, isWholesale: true })).toBe(false);
    expect(isRetailCustomerRepair({ ...retailRepair, billing: { mode: 'wholesale' } })).toBe(false);
    expect(isRetailCustomerRepair({ ...retailRepair, compRepair: true })).toBe(false);
    expect(isRetailCustomerRepair({ ...retailRepair, billing: { mode: 'internal' } })).toBe(false);
    expect(isRetailCustomerRepair(null)).toBe(false);
  });
});

describe('pay token + link + message (pure)', () => {
  it('tokens are long, URL-safe and unique', () => {
    const a = newPayToken(); const b = newPayToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{30,}$/);
    expect(a).not.toBe(b);
    // The customer pays in the SHOP, not here — the admin app only mints the token.
    expect(payLinkFor(a)).toMatch(new RegExp(`/repair/pay/${a}$`));
  });

  it('message names the customer, the count and the balance, and offers pay-at-pickup', () => {
    const m = buildReadyMessage({ clientName: 'Caroline Sullivan', amountDue: 43.8, repairCount: 1 });
    expect(m).toContain('Good news, Caroline!');
    expect(m).toContain('Your repair has passed final inspection');
    expect(m).toContain('$43.80');
    expect(m).toContain('pay when you collect it');
    expect(buildReadyMessage({ amountDue: 0, repairCount: 2 })).toContain('Your 2 repairs have');
    expect(buildReadyMessage({ amountDue: 0 })).toContain('no balance due');
  });
});

describe('notifyReadyForPickup', () => {
  it('stamps a pay token, notifies email + push + in-app with the PUBLIC pay link, and records pickupNotice', async () => {
    const out = await notifyReadyForPickup({ repairID: 'r1', actor: 'jacob' });
    expect(out.sent).toBe(true);
    expect(out.amountDue).toBe(43.8);
    expect(mocks.updateByInvoiceID).toHaveBeenCalledWith('rinv-1', expect.objectContaining({ payToken: expect.stringMatching(/^[A-Za-z0-9_-]{30,}$/) }));
    const n = mocks.createNotification.mock.calls[0][0];
    expect(n.userId).toBe('user-c1');
    expect(n.recipientEmail).toBe('caroline@example.com');
    expect(n.channels).toEqual(['inApp', 'email', 'push']);
    expect(n.data.actionUrl).toMatch(/\/repair\/pay\/[A-Za-z0-9_-]{30,}$/);
    expect(n.data.actionLabel).toBe('See it & pay');
    expect(n.title).toContain('$43.80');
    const stamp = mocks.updateById.mock.calls[0][1].pickupNotice;
    expect(stamp.invoiceID).toBe('rinv-1');
    expect(stamp.payUrl).toBe(n.data.actionUrl);
    expect(stamp.count).toBe(1);
  });

  it('reuses an existing pay token instead of rotating it', async () => {
    mocks.findByInvoiceID.mockResolvedValue({ invoiceID: 'rinv-1', repairIDs: ['r1'], paymentStatus: 'unpaid', remainingBalance: 10, payToken: 'existing-token-value-that-is-long-enough' });
    const out = await notifyReadyForPickup({ repairID: 'r1' });
    expect(out.payUrl).toMatch(/existing-token-value-that-is-long-enough$/);
    expect(mocks.updateByInvoiceID).not.toHaveBeenCalled();
  });

  it('is idempotent per repair unless forced', async () => {
    mocks.findById.mockResolvedValue({ ...retailRepair, pickupNotice: { sentAt: new Date(), count: 1 } });
    expect((await notifyReadyForPickup({ repairID: 'r1' })).reason).toBe('already notified');
    expect(mocks.createNotification).not.toHaveBeenCalled();
    const forced = await notifyReadyForPickup({ repairID: 'r1', force: true });
    expect(forced.sent).toBe(true);
    expect(mocks.updateById.mock.calls[0][1].pickupNotice.count).toBe(2);
  });

  it('skips wholesale / comped repairs and repairs with no contact, and never throws', async () => {
    mocks.findById.mockResolvedValue({ ...retailRepair, isWholesale: true });
    expect((await notifyReadyForPickup({ repairID: 'r1' })).reason).toBe('not a retail customer repair');
    mocks.findById.mockResolvedValue({ ...retailRepair, userID: '' });
    mocks.usersFindOne.mockResolvedValue(null);
    expect((await notifyReadyForPickup({ repairID: 'r1' })).reason).toBe('no customer contact on file');
    mocks.findById.mockRejectedValue(new Error('db down'));
    expect((await notifyReadyForPickup({ repairID: 'r1' })).sent).toBe(false);
  });

  it('a paid invoice gets a notice with no pay link and no token', async () => {
    mocks.findByInvoiceID.mockResolvedValue({ invoiceID: 'rinv-1', repairIDs: ['r1'], paymentStatus: 'paid', remainingBalance: 0 });
    const out = await notifyReadyForPickup({ repairID: 'r1' });
    expect(out.sent).toBe(true);
    expect(out.payUrl).toBe('');
    expect(mocks.updateByInvoiceID).not.toHaveBeenCalled();
    expect(mocks.createNotification.mock.calls[0][0].data.actionLabel).toBe('View details');
  });
});
