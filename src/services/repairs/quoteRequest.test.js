import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/database', () => ({ db: { connect: vi.fn() } }));
vi.mock('@/services/wholesale/invoiceNotifications', () => ({ resolveWholesaleInvoiceRecipients: vi.fn(async () => [{ userID: 'ws-1', email: 's@x.test', business: 'Greers Pawn' }]) }));
vi.mock('@/lib/notificationService', () => ({ NotificationService: { createNotification: vi.fn(async () => ({})) }, CHANNELS: { IN_APP: 'inApp', EMAIL: 'email' } }));
vi.mock('@/lib/appUrls', () => ({ adminLink: (p) => `http://test${p}` }));

import { buildQuoteRequest, isQuoteRequested, shouldMarkQuoteReady, buildQuoteReadyUpdate, notifyQuoteReady, receivedMessage, QUOTE_REQUEST_STATUS } from './quoteRequest';
import { buildReceiveRepairUpdate } from '@/services/repairWorkflow';
import { resolveWholesaleInvoiceRecipients } from '@/services/wholesale/invoiceNotifications';
import { NotificationService } from '@/lib/notificationService';

describe('Request Quote on a wholesale repair', () => {
  const now = new Date('2026-09-21T20:00:00Z');
  const requested = { repairID: 'r1', totalCost: 0, quoteRequest: buildQuoteRequest({ actor: { userID: 'ws-1', name: 'Sam Johnson' }, now }) };

  it('stamps a requested block with who asked and when', () => {
    expect(requested.quoteRequest).toMatchObject({ status: 'requested', requestedBy: 'ws-1', requestedByName: 'Sam Johnson', requestedAt: now, quotedTotal: null });
    expect(isQuoteRequested(requested)).toBe(true);
    expect(isQuoteRequested({})).toBe(false);
  });

  it('flips to quoted only when a requested repair gains a price', () => {
    expect(shouldMarkQuoteReady(requested, { ...requested, totalCost: 0 })).toBe(false);
    expect(shouldMarkQuoteReady(requested, { ...requested, totalCost: 86.5 })).toBe(true);
    expect(shouldMarkQuoteReady({ repairID: 'r2', totalCost: 0 }, { totalCost: 50 })).toBe(false); // never asked
    const quoted = { ...requested, quoteRequest: { ...requested.quoteRequest, status: 'quoted' } };
    expect(shouldMarkQuoteReady(quoted, { totalCost: 99 })).toBe(false); // already quoted — no re-notify
  });

  it('records the quoted total and keeps the original request details', () => {
    const set = buildQuoteReadyUpdate(requested, { totalCost: 86.499 }, { now });
    expect(set.quoteRequest).toMatchObject({ status: QUOTE_REQUEST_STATUS.QUOTED, quotedAt: now, quotedTotal: 86.5, requestedBy: 'ws-1' });
  });

  it('notifies the store through the invoice identity rules (store id + business key), with the number', async () => {
    const repair = { repairID: 'r1', clientName: 'Nick', totalCost: 86.5, storeId: 'ws-1', createdBy: 'ws-1', businessName: 'Greers Pawn' };
    const summary = await notifyQuoteReady(repair);
    expect(resolveWholesaleInvoiceRecipients).toHaveBeenCalledWith({ storeId: 'ws-1', clientID: 'ws-1', accountID: 'wholesale-business:greers-pawn' });
    expect(summary.notified).toBe(1);
    const call = NotificationService.createNotification.mock.calls[0][0];
    expect(call.type).toBe('wholesale-quote-ready');
    expect(call.message).toMatch(/\$86\.50/);
    expect(call.data.actionUrl).toBe('http://test/dashboard/repairs/r1');
  });
});

describe('a checked-in Request Quote job waits in NEEDS QUOTE (owner, 2026-10-01, Q8)', () => {
  const now = new Date('2026-10-01T20:00:00Z');
  const requested = { repairID: 'r1', totalCost: 0, quoteRequest: buildQuoteRequest({ actor: { userID: 'ws-1' }, now }) };

  it('check-in sends it to NEEDS QUOTE, off the bench; any other job to READY FOR WORK', () => {
    expect(buildReceiveRepairUpdate({ userID: 's', quoteRequested: true, now })).toMatchObject({ status: 'NEEDS QUOTE', benchStatus: null });
    expect(buildReceiveRepairUpdate({ userID: 's', now })).toMatchObject({ status: 'READY FOR WORK', benchStatus: 'UNCLAIMED' });
  });

  it('pricing a job waiting in the shop moves it to READY FOR WORK and onto the bench', () => {
    const waiting = { ...requested, status: 'NEEDS QUOTE' };
    expect(buildQuoteReadyUpdate(waiting, { ...waiting, totalCost: 40 }, { now }))
      .toMatchObject({ status: 'READY FOR WORK', benchStatus: 'UNCLAIMED', quoteRequest: { status: 'quoted', quotedTotal: 40 } });
  });

  it('pricing a job not yet in the shop leaves its status alone (it is checked in as usual)', () => {
    const notIn = { ...requested, status: 'PENDING PICKUP' };
    const set = buildQuoteReadyUpdate(notIn, { ...notIn, totalCost: 40 }, { now });
    expect(set).not.toHaveProperty('status');
    expect(set).not.toHaveProperty('benchStatus');
  });

  it("tells the store which jobs are queued and which wait on a quote", () => {
    expect(receivedMessage(['a', 'b'])).toBe('2 repair(s) checked in at the shop and queued for work: a, b');
    expect(receivedMessage(['a', 'q'], new Set(['q'])))
      .toBe("1 repair(s) checked in at the shop and queued for work: a. 1 checked in and waiting on our quote (we'll send you the price): q");
  });

  it('the quote-ready note says the piece is already in the queue when it was checked in', async () => {
    NotificationService.createNotification.mockClear();
    await notifyQuoteReady({ repairID: 'r1', totalCost: 40, receivedAt: now, storeId: 'ws-1' });
    expect(NotificationService.createNotification.mock.calls[0][0].message).toMatch(/We have the piece/);
  });
});
