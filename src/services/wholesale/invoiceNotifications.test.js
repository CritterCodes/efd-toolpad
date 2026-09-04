import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Wholesale invoice finalize → partner notification. The properties that matter:
 *   - only wholesale invoices notify, and only ONCE (partnerNotifiedAt is the dedupe)
 *   - recipients mirror the portal's identity rules (clientID/storeId, business key), deduped
 *   - "emailed" is read back from the STORED notification doc, never assumed from the send call
 *   - zero recipients leaves the invoice UNstamped so a later finalize can still deliver
 *   - one failed recipient does not stop the others, and nothing here ever throws
 */

const mocks = vi.hoisted(() => ({
  usersFind: vi.fn(),
  notificationsFindOne: vi.fn(),
  updateByInvoiceID: vi.fn(async () => ({})),
  createNotification: vi.fn(),
}));

vi.mock('@/lib/database', () => ({
  db: {
    connect: vi.fn(async () => ({
      collection: (name) => (name === 'users'
        ? { find: (...args) => ({ toArray: async () => mocks.usersFind(...args) }) }
        : { findOne: mocks.notificationsFindOne }),
    })),
  },
}));
vi.mock('@/app/api/repair-invoices/model', () => ({
  default: { updateByInvoiceID: mocks.updateByInvoiceID },
}));
vi.mock('@/lib/notificationService', () => ({
  NotificationService: { createNotification: mocks.createNotification },
  NOTIFICATION_TYPES: { WHOLESALE_INVOICE_FINALIZED: 'wholesale-invoice-finalized' },
}));
vi.mock('@/lib/appUrls', () => ({
  adminLink: (path) => `https://admin.test${path}`,
}));

const { notifyWholesaleInvoiceFinalized, resolveWholesaleInvoiceRecipients } = await import('./invoiceNotifications');

const marlen = { userID: 'ws-marlen', email: 'marlen@store.test', business: "Marlen's Jewelers" };

const wholesaleInvoice = {
  invoiceID: 'rinv-1',
  accountType: 'wholesale',
  accountID: 'wholesale-business:marlen-s-jewelers',
  clientID: 'ws-marlen',
  storeId: '',
  repairIDs: ['r1', 'r2'],
  total: 250,
  remainingBalance: 250,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.usersFind.mockResolvedValue([]);
  mocks.createNotification.mockResolvedValue({ _id: 'n1' });
  mocks.notificationsFindOne.mockResolvedValue({ email: { sent: true } });
});

describe('notifyWholesaleInvoiceFinalized', () => {
  it('skips retail invoices without touching anything', async () => {
    const result = await notifyWholesaleInvoiceFinalized({ accountType: 'retail' });
    expect(result.skipped).toBe('not-wholesale');
    expect(mocks.createNotification).not.toHaveBeenCalled();
    expect(mocks.updateByInvoiceID).not.toHaveBeenCalled();
  });

  it('never notifies twice — partnerNotifiedAt is the dedupe', async () => {
    const result = await notifyWholesaleInvoiceFinalized({ ...wholesaleInvoice, partnerNotifiedAt: new Date() });
    expect(result.skipped).toBe('already-notified');
    expect(mocks.createNotification).not.toHaveBeenCalled();
  });

  it('notifies the matching partner, reads email outcome from the stored doc, and stamps the invoice', async () => {
    mocks.usersFind.mockResolvedValue([marlen]);

    const result = await notifyWholesaleInvoiceFinalized(wholesaleInvoice);

    expect(result.notified).toBe(1);
    expect(result.emailed).toBe(1);
    expect(mocks.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'ws-marlen',
      type: 'wholesale-invoice-finalized',
      recipientEmail: 'marlen@store.test',
      channels: ['inApp', 'email'],
      message: expect.stringContaining('rinv-1'),
      data: expect.objectContaining({ actionUrl: 'https://admin.test/dashboard/wholesaler/billing' }),
    }));
    expect(mocks.updateByInvoiceID).toHaveBeenCalledWith('rinv-1', expect.objectContaining({
      partnerNotifiedAt: expect.any(Date),
    }));
  });

  it('does not claim an email was sent when the stored doc says it failed', async () => {
    mocks.usersFind.mockResolvedValue([marlen]);
    mocks.notificationsFindOne.mockResolvedValue({ email: { sent: false, error: 'no smtp' } });

    const result = await notifyWholesaleInvoiceFinalized(wholesaleInvoice);

    expect(result.notified).toBe(1);
    expect(result.emailed).toBe(0);
    expect(result.errors.join(' ')).toContain('no smtp');
    // In-app still landed, so the dedupe stamp still applies.
    expect(mocks.updateByInvoiceID).toHaveBeenCalled();
  });

  it('leaves the invoice unstamped when no portal account matches, so a later finalize can deliver', async () => {
    mocks.usersFind.mockResolvedValue([]);

    const result = await notifyWholesaleInvoiceFinalized(wholesaleInvoice);

    expect(result.notified).toBe(0);
    expect(result.errors[0]).toMatch(/no portal account/i);
    expect(mocks.updateByInvoiceID).not.toHaveBeenCalled();
  });

  it('one failed recipient does not stop the others, and the function never throws', async () => {
    const second = { userID: 'ws-clerk', email: 'clerk@store.test', business: "Marlen's Jewelers" };
    mocks.usersFind
      .mockResolvedValueOnce([marlen])          // byId
      .mockResolvedValueOnce([marlen, second]); // wholesalers by business
    mocks.createNotification
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ _id: 'n2' });

    const result = await notifyWholesaleInvoiceFinalized(wholesaleInvoice);

    expect(result.notified).toBe(1);
    expect(result.errors.join(' ')).toContain('boom');
    expect(mocks.updateByInvoiceID).toHaveBeenCalled();
  });
});

describe('resolveWholesaleInvoiceRecipients', () => {
  it('dedupes a partner matched both by clientID and by business key', async () => {
    mocks.usersFind
      .mockResolvedValueOnce([marlen])  // byId
      .mockResolvedValueOnce([marlen]); // wholesalers by business

    const recipients = await resolveWholesaleInvoiceRecipients(wholesaleInvoice);
    expect(recipients).toHaveLength(1);
    expect(recipients[0].userID).toBe('ws-marlen');
  });

  it('matches by normalized business name for admin-created invoices with no clientID', async () => {
    mocks.usersFind.mockResolvedValueOnce([
      marlen,
      { userID: 'ws-other', email: 'other@x.test', business: 'Other Store' },
    ]);

    const recipients = await resolveWholesaleInvoiceRecipients({
      ...wholesaleInvoice,
      clientID: '',
      storeId: '',
    });
    expect(recipients).toHaveLength(1);
    expect(recipients[0].userID).toBe('ws-marlen');
  });
});
