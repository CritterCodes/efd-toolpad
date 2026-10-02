// @vitest-environment jsdom
//
// F41 — merging an invoice no longer means typing its ID from memory.
//
// The control was a free-text box labelled "Merge Into Invoice ID", with the valid targets printed
// underneath as a comma-separated caption: `Same-account merge targets: rinv-002, rinv-003`. The answer
// was always already on screen. It just wasn't the control, so the one thing a person could do was
// retype it — and a typo, or an invoice belonging to a different account, reached the route.
//
// A picker makes the wrong answer unreachable rather than merely discouraged, which is what these tests
// pin: the options are exactly the same-account targets the parent computed, merging sends the chosen ID,
// and with nothing to merge into the control says so instead of offering an empty box.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('./FinalizeFulfillment', () => ({ default: () => null }));
vi.mock('./invoicePrint', () => ({ formatDate: () => 'Oct 2, 2026', printInvoice: vi.fn() }));

import { InvoiceCard } from './InvoiceCard';

const invoice = {
  invoiceID: 'rinv-001',
  status: 'draft',
  paymentStatus: 'unpaid',
  accountType: 'retail',
  accountID: 'cust-1',
  total: 180,
  remainingBalance: 180,
  repairs: [{ repairID: 'REP-1', description: 'Resize', total: 180 }],
  payments: [],
};

const targets = [
  { invoiceID: 'rinv-002', total: 240, repairs: [{ repairID: 'REP-2' }, { repairID: 'REP-3' }] },
  { invoiceID: 'rinv-003', total: 95, repairs: [{ repairID: 'REP-4' }] },
];

const noop = vi.fn();

function show({ mergeTargets = targets, onMergeInvoice = vi.fn() } = {}) {
  render(
    <InvoiceCard
      invoice={invoice}
      mergeTargets={mergeTargets}
      onFinalize={noop}
      onCashPay={noop}
      onCreateStripe={noop}
      onSyncStripe={noop}
      onCardCollected={noop}
      onConvertCashToCard={noop}
      onCreateTerminal={noop}
      onSyncTerminal={noop}
      onUpdateDelivery={noop}
      onSplitInvoice={noop}
      onMergeInvoice={onMergeInvoice}
      onRemoveRepairs={noop}
      onReopen={noop}
      onPayLink={noop}
      onPickedUp={noop}
    />,
  );
  return { onMergeInvoice };
}

/** Open the merge picker and return its options. */
function openPicker() {
  fireEvent.mouseDown(screen.getByLabelText('Merge into'));
  return within(screen.getByRole('listbox')).getAllByRole('option');
}

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('merging an invoice', () => {
  it('offers the same-account targets as choices, not as a caption to retype', () => {
    show();
    const options = openPicker();
    expect(options.map((o) => o.textContent)).toEqual([
      expect.stringContaining('rinv-002'),
      expect.stringContaining('rinv-003'),
    ]);
    // The caption that used to carry this is gone, because the control carries it now.
    expect(screen.queryByText(/Same-account merge targets/)).not.toBeInTheDocument();
  });

  it('shows enough to tell two invoices apart', () => {
    show();
    const [first] = openPicker();
    expect(first).toHaveTextContent('$240.00');
    expect(first).toHaveTextContent('2 repairs');
  });

  it('says "1 repair", not "1 repairs"', () => {
    show();
    const [, second] = openPicker();
    expect(second).toHaveTextContent('1 repair');
    expect(second).not.toHaveTextContent('1 repairs');
  });

  it('will not merge until a target is chosen', () => {
    show();
    expect(screen.getByRole('button', { name: 'Merge' })).toBeDisabled();
  });

  it('merges into the invoice that was picked', () => {
    const { onMergeInvoice } = show();
    fireEvent.click(openPicker()[1]);
    fireEvent.click(screen.getByRole('button', { name: 'Merge' }));
    expect(onMergeInvoice).toHaveBeenCalledWith('rinv-001', 'rinv-003');
  });

  it('says so when there is nothing to merge into, instead of offering an empty box', () => {
    show({ mergeTargets: [] });
    // A disabled MUI Select is a `role="combobox"` div carrying `aria-disabled`, not a disabled input,
    // so `toBeDisabled()` cannot see it. The attribute is what a screen reader reads either way.
    expect(screen.getByLabelText('Nothing to merge into')).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText(/no other open invoice to merge into/i)).toBeInTheDocument();
  });
});
