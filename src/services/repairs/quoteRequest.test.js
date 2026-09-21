import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/database', () => ({ db: { connect: vi.fn() } }));
vi.mock('@/services/wholesale/invoiceNotifications', () => ({ resolveWholesaleInvoiceRecipients: vi.fn(async () => [{ userID: 'ws-1', email: 's@x.test', business: 'Greers Pawn' }]) }));
vi.mock('@/lib/notificationService', () => ({ NotificationService: { createNotification: vi.fn(async () => ({})) }, CHANNELS: { IN_APP: 'inApp', EMAIL: 'email' } }));
vi.mock('@/lib/appUrls', () => ({ adminLink: (p) => `http://test${p}` }));

import { buildQuoteRequest, isQuoteRequested, shouldMarkQuoteReady, buildQuoteReadyUpdate, notifyQuoteReady, QUOTE_REQUEST_STATUS } from './quoteRequest';
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
