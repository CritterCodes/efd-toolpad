/**
 * Sending a message on a custom order answers as soon as the message is WRITTEN.
 *
 * 2026-11-10: the client's email/push step hung, the request was killed at 15 seconds, and the owner saw "Failed to
 * send" over a message that had been saved. The notification now runs after the response; this holds that in place.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const afterCallbacks = [];
vi.mock('next/server', async (original) => ({
  ...(await original()),
  after: (fn) => { afterCallbacks.push(fn); },
}));
vi.mock('@/lib/customsPermissions', () => ({
  requireCustomsCadWrite: vi.fn(async () => ({ session: { user: { name: 'Jacob', userID: 'u1' } } })),
  requireCustomsRead: vi.fn(async () => ({})),
}));
vi.mock('@/app/api/custom-orders/model', () => ({
  default: {
    findById: vi.fn(async () => ({ customID: 'CO-1', clientID: 'client-1', customerEmail: 'client@example.com', title: 'Ring' })),
    addCommunication: vi.fn(async (id, m) => ({ id: 'm1', ...m, thread: m.thread || 'client' })),
  },
}));
vi.mock('@/lib/notificationService', () => ({ NotificationService: { createNotification: vi.fn() } }));
vi.mock('@/lib/appUrls', () => ({ portalLink: () => 'https://shop.example/portal' }));

import { POST } from './route';
import CustomOrdersModel from '@/app/api/custom-orders/model';
import { NotificationService } from '@/lib/notificationService';

const send = (body) => POST(
  new Request('http://localhost/api/custom-orders/CO-1/communications', { method: 'POST', body: JSON.stringify(body) }),
  { params: Promise.resolve({ customID: 'CO-1' }) },
);

beforeEach(() => {
  afterCallbacks.length = 0;
  vi.clearAllMocks();
});

describe('POST /api/custom-orders/[customID]/communications', () => {
  it('answers 201 with the message even when the client notification never finishes', async () => {
    NotificationService.createNotification.mockReturnValue(new Promise(() => {})); // hangs forever
    const res = await send({ text: 'Is 1k a strict budget?', thread: 'client' });
    expect(res.status).toBe(201);
    expect((await res.json()).text).toBe('Is 1k a strict budget?');
    expect(CustomOrdersModel.addCommunication).toHaveBeenCalledTimes(1);
    // Not started before the answer: it is queued to run after the response.
    expect(NotificationService.createNotification).not.toHaveBeenCalled();
    expect(afterCallbacks).toHaveLength(1);
  });

  it('still notifies the client, after the response, and a failure there is swallowed', async () => {
    NotificationService.createNotification.mockRejectedValue(new Error('smtp down'));
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {});
    await send({ text: 'hello', thread: 'client' });
    await expect(afterCallbacks[0]()).resolves.toBeUndefined();
    expect(NotificationService.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'client-1', type: 'custom-message', recipientEmail: 'client@example.com',
    }));
    quiet.mockRestore();
  });

  it('an internal note notifies nobody', async () => {
    const res = await send({ text: 'team only', thread: 'internal' });
    expect(res.status).toBe(201);
    expect(afterCallbacks).toHaveLength(0);
  });

  it('an empty message is refused and nothing is written', async () => {
    const res = await send({ text: '   ' });
    expect(res.status).toBe(400);
    expect(CustomOrdersModel.addCommunication).not.toHaveBeenCalled();
  });
});
