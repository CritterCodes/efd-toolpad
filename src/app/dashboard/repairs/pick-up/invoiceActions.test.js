import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invoiceActions } from './invoiceActions';

/**
 * The Payment & Pickup invoice actions, now testable outside the page: each posts to the invoice route,
 * reports through showMessage, reloads, and lands on the right tab.
 */
function setup(response = { ok: true, json: async () => ({}) }) {
  const deps = { showMessage: vi.fn(), loadData: vi.fn(async () => {}), setTab: vi.fn(), setCollectingTerminalInvoiceID: vi.fn() };
  global.fetch = vi.fn(async () => response);
  return { deps, actions: invoiceActions(deps) };
}

describe('invoiceActions', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('records a cash payment: posts the amount, confirms, reloads', async () => {
    const { deps, actions } = setup();
    await actions.handleCashPayment('rinv-1', '40.5', 'paid at counter');
    expect(fetch).toHaveBeenCalledWith('/api/repair-invoices/rinv-1/payments/cash', expect.objectContaining({ method: 'POST' }));
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ amount: 40.5, notes: 'paid at counter' });
    expect(deps.showMessage).toHaveBeenCalledWith('Recorded cash payment on rinv-1.', 'success');
    expect(deps.loadData).toHaveBeenCalled();
  });

  it('removing repairs sends them back to closeout (tab 0)', async () => {
    const { deps, actions } = setup();
    await actions.handleRemoveRepairsFromInvoice('rinv-1', ['repair-1', 'repair-2']);
    expect(deps.showMessage).toHaveBeenCalledWith('Moved 2 repairs back to closeout.', 'success');
    expect(deps.setTab).toHaveBeenCalledWith(0);
  });

  it('finalize reports when the customer was NOT notified, and lands on Open (tab 2)', async () => {
    const { deps, actions } = setup({ ok: true, json: async () => ({ pickupNotice: { sent: false, reason: 'no email on file' } }) });
    await actions.handleFinalizeInvoice('rinv-1');
    expect(deps.showMessage).toHaveBeenLastCalledWith('Finalized invoice rinv-1, but the customer was NOT notified: no email on file', 'warning');
    expect(deps.setTab).toHaveBeenCalledWith(2);
  });

  it('a failed action shows the route error and does not reload', async () => {
    const { deps, actions } = setup({ ok: false, json: async () => ({ error: 'Invoice is locked.' }) });
    await actions.handleSplitInvoice('rinv-1', ['repair-1']);
    expect(deps.showMessage).toHaveBeenCalledWith('Invoice is locked.', 'error');
    expect(deps.loadData).not.toHaveBeenCalled();
  });
});
