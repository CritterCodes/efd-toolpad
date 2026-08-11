import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * THE RECEIPT THAT WAS NEVER SENT.
 *
 * A customer paid $5,500 cash. The notification record said the receipt had been emailed. Nothing had
 * been: EMAIL_USER/EMAIL_PASSWORD were unset in production, so every send failed three retries. The
 * production log shows the contradiction on two consecutive lines —
 *
 *   ❌ Failed to send payment-received email to <customer>: EMAIL_USER and EMAIL_PASSWORD ... required
 *   ✅ Email notification sent to <customer>
 *
 * because `sendNotificationEmail` reports failure by RETURNING `{ success: false }` rather than
 * throwing, so the channel's try/catch never fired and it wrote `email.sent: true` unconditionally.
 * Every email in the app's history was recorded as delivered.
 *
 * These tests pin the flag to reality. They are deliberately about the RECORD, not the transport: the
 * whole failure was that the record and the transport disagreed and the record was the one anyone read.
 */

const updates = [];
let emailResult;
let emailError;

vi.mock('./email.js', () => ({
  sendNotificationEmail: vi.fn(async () => {
    if (emailError) throw emailError;
    return emailResult;
  }),
}));
vi.mock('./webPush.js', () => ({ sendPushToUser: vi.fn(async () => ({ sent: 0 })) }));
vi.mock('./appUrls.js', () => ({ adminBase: () => 'https://admin.test', shopBase: () => 'https://shop.test' }));
vi.mock('../src/lib/database.js', () => ({
  db: {
    connect: vi.fn(async () => ({
      collection: () => ({
        insertOne: async () => ({ insertedId: 'notif-1' }),
        updateOne: async (_filter, ops) => { updates.push(ops.$set); return { modifiedCount: 1 }; },
      }),
    })),
  },
}));

const emailStatus = () => updates.find((u) => 'email.sent' in u) || null;

async function notify(overrides = {}) {
  const { createNotification } = await import('./notificationService.js');
  return createNotification({
    userId: 'user-1',
    userEmail: 'buyer@example.com',
    type: 'payment-received',
    title: 'Payment Received',
    message: 'Payment of $5500.00 received.',
    channels: ['email'],
    ...overrides,
  });
}

beforeEach(() => {
  updates.length = 0;
  emailResult = { success: true, messageId: 'mid-1' };
  emailError = undefined;
  // clearAllMocks, not just resetModules: the vi.mock factory's spy is shared across this file, so
  // call counts from earlier cases would otherwise leak into the "never attempted a send" assertion.
  vi.clearAllMocks();
  vi.resetModules();
});

describe('email.sent reflects what actually happened', () => {
  it('records sent when the transport really delivered', async () => {
    await notify();
    expect(emailStatus()['email.sent']).toBe(true);
  });

  it('records NOT sent when the helper returns success:false — the $5,500 receipt case', async () => {
    // Exactly what an unset EMAIL_USER produces: no throw, a falsy result.
    emailResult = { success: false, reason: 'EMAIL_USER and EMAIL_PASSWORD environment variables are required' };
    await notify();

    const status = emailStatus();
    expect(status['email.sent']).toBe(false);
    expect(status['email.error']).toMatch(/EMAIL_USER/);
  });

  it('records NOT sent when the transport throws outright', async () => {
    emailError = new Error('535 authentication failed');
    await notify();

    expect(emailStatus()['email.sent']).toBe(false);
    expect(emailStatus()['email.error']).toMatch(/535/);
  });

  it('refuses to call a blank recipient delivered', async () => {
    // A notification addressed to '' (an unset admin env var) used to look identical to a real send.
    await notify({ userEmail: '' });

    expect(emailStatus()['email.sent']).toBe(false);
    expect(emailStatus()['email.error']).toMatch(/recipient/i);
  });

  it('does not attempt a send at all when there is no recipient', async () => {
    const { sendNotificationEmail } = await import('./email.js');
    await notify({ userEmail: '' });
    expect(sendNotificationEmail).not.toHaveBeenCalled();
  });

  it('a failed email never throws out of createNotification — the payment must still commit', async () => {
    // Marking an invoice paid is a committed money event; a dead mail server cannot roll it back.
    emailResult = { success: false, reason: 'smtp down' };
    await expect(notify()).resolves.toBeTruthy();
  });
});
