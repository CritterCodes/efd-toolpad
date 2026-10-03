import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * IF WE KNOW WHO IT IS FOR, WE KNOW WHERE TO SEND IT.
 *
 * 126 notifications in production were written and then failed with "no recipient email on the
 * notification". **39 of them carried a `userId` whose user had an address on file the whole time** —
 * 33 "We received your repair request" acknowledgements, 5 work-order assignments, 1 ready-for-pickup.
 * The record was written, the failure was honestly recorded, and nobody was told.
 *
 * The callers are not wrong to omit the address. A repair record does not always copy the customer's
 * email — `newRepair.email || newRepair.clientEmail || newRepair.customerEmail || ''` is empty often
 * enough — and the create path quite reasonably proceeds when it has *either* an id or an address.
 * Asking two dozen call sites each to remember a lookup is how you get nineteen that remember and five
 * that do not. So the lookup belongs at the sink, where every type passes through exactly once.
 *
 * (Same shape as the receipt that was never sent, next door in notificationEmailStatus.test.js: the
 * record and reality disagreed, and the record was the one anyone read.)
 */

const updates = [];
const sends = [];
let users = [];
let lookupError;

vi.mock('./email.js', () => ({
  sendNotificationEmail: vi.fn(async (args) => {
    sends.push(args);
    return { success: true, messageId: 'mid-1' };
  }),
}));
vi.mock('./webPush.js', () => ({ sendPushToUser: vi.fn(async () => ({ sent: 0 })) }));
vi.mock('./appUrls.js', () => ({ adminBase: () => 'https://admin.test', shopBase: () => 'https://shop.test' }));
vi.mock('../src/lib/database.js', () => ({
  db: {
    connect: vi.fn(async () => ({
      collection: (name) => ({
        insertOne: async () => ({ insertedId: 'notif-1' }),
        updateOne: async (_filter, ops) => { updates.push(ops.$set); return { modifiedCount: 1 }; },
        findOne: async (filter) => {
          if (name !== 'users') return null;
          if (lookupError) throw lookupError;
          return users.find((u) => u.userID === filter.userID) || null;
        },
      }),
    })),
  },
}));

const inserted = () => updates;
const emailStatus = () => updates.find((u) => 'email.sent' in u) || null;

async function notify(overrides = {}) {
  const { createNotification } = await import('./notificationService.js');
  return createNotification({
    userId: 'user-1',
    type: 'repair-lead-received',
    title: 'We received your repair request',
    message: 'Thanks!',
    channels: ['email'],
    ...overrides,
  });
}

beforeEach(() => {
  updates.length = 0;
  sends.length = 0;
  users = [{ userID: 'user-1', email: 'customer@example.com' }];
  lookupError = undefined;
  vi.clearAllMocks();
  vi.resetModules();
});

describe('finding the address', () => {
  it('looks it up from the user when the caller did not carry one — the 39 that failed', async () => {
    const doc = await notify();
    expect(sends).toHaveLength(1);
    expect(sends[0].recipientEmail).toBe('customer@example.com');
    expect(emailStatus()['email.sent']).toBe(true);
    // And the stored record says where it actually went, so the next person reading it is not misled.
    expect(doc.userEmail).toBe('customer@example.com');
  });

  it('never overrides an address the caller gave', async () => {
    await notify({ userEmail: 'explicit@example.com' });
    expect(sends[0].recipientEmail).toBe('explicit@example.com');
  });

  it('still fails honestly when the user has no address either', async () => {
    users = [{ userID: 'user-1' }];
    await notify();
    expect(sends).toHaveLength(0);
    expect(emailStatus()['email.sent']).toBe(false);
    expect(emailStatus()['email.error']).toMatch(/no recipient email/);
  });

  it('still fails honestly when there is no user to look up', async () => {
    await notify({ userId: null });
    expect(sends).toHaveLength(0);
    expect(emailStatus()['email.sent']).toBe(false);
  });

  it('does not look anything up when email was never asked for', async () => {
    // `repair-assigned` is in-app and push only. 19 of those have no email and that is correct;
    // a lookup there would be a database round-trip for a channel nobody requested.
    await notify({ channels: ['inApp'] });
    expect(sends).toHaveLength(0);
    expect(inserted().some((u) => 'email.sent' in u)).toBe(false);
  });

  it('writes the notification even when the lookup itself throws', async () => {
    // The in-app copy is real whether or not an address was found. A failed lookup must not cost the
    // notification — that would trade a missing email for a missing message.
    lookupError = new Error('mongo down');
    await notify();
    expect(emailStatus()['email.sent']).toBe(false);
    expect(sends).toHaveLength(0);
  });
});
