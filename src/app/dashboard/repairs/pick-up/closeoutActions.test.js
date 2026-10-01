import { describe, it, expect, vi } from 'vitest';
import { closeoutActions } from './closeoutActions';

/** The Payment & Pickup scan + closeout actions, testable outside the page. */
function setup(over = {}) {
  const deps = {
    batchNotes: '', closeoutRepairs: [{ repairID: 'repair-1' }], deliveryFee: 5, deliveryMethod: 'pickup',
    invoices: [{ invoiceID: 'RINV-7', status: 'open' }], loadData: vi.fn(), selectedMissingPhotoCount: 0,
    selectedRepairIDs: [], setBatchNotes: vi.fn(), setCloseoutNotes: vi.fn(), setCloseoutRepairs: vi.fn(),
    setCloseoutScannerOpen: vi.fn(), setDeliveryFee: vi.fn(), setDeliveryMethod: vi.fn(), setInvoiceScannerOpen: vi.fn(),
    setInvoiceSearch: vi.fn(), setLegacyClosing: vi.fn(), setSavingPhotoRepairID: vi.fn(), setScannedRepairID: vi.fn(),
    setSelectedRepairIDs: vi.fn(), setSubmittingInvoice: vi.fn(), setTab: vi.fn(), showMessage: vi.fn(), ...over,
  };
  return { deps, actions: closeoutActions(deps) };
}

describe('closeoutActions', () => {
  it('a scanned invoice opens the tab it lives on', () => {
    const { deps, actions } = setup();
    actions.handleInvoiceScan('rinv-7');
    expect(deps.setInvoiceSearch).toHaveBeenCalled();
    expect(deps.setTab).toHaveBeenCalledWith(2);
    expect(deps.showMessage).toHaveBeenCalledWith('Found invoice RINV-7.', 'success');
  });

  it('a scanned repair that is not in the queue is reported, not opened', () => {
    const { deps, actions } = setup();
    actions.handleCloseoutScan('repair-9');
    expect(deps.showMessage).toHaveBeenCalledWith('repair-9 is not in the Payment & Pickup queue.', 'warning');
    expect(deps.setScannedRepairID).not.toHaveBeenCalled();
  });

  it('creating an invoice with nothing selected asks for a selection first', async () => {
    const { deps, actions } = setup();
    await actions.handleCreateInvoice();
    expect(deps.showMessage).toHaveBeenCalledWith('Select at least one completed repair to batch.', 'warning');
    // Never started submitting (the `finally` still resets it to false).
    expect(deps.setSubmittingInvoice).not.toHaveBeenCalledWith(true);
  });
});
