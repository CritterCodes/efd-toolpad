// @vitest-environment jsdom
//
// F48 — the bench can look a part up instead of remembering its number.
//
// "Move to Needs Parts" asked for a Stuller part number, typed from memory, at the bench, with the piece in
// your hand. Intake has had a search against the same catalogue the whole time. The jeweler knows what the
// part *is*; the number is the one thing they do not have.
//
// This renders the real dialog, because the claim is about behaviour: a search runs, results come back,
// picking one fills the part number, and typing a number you already know still works. `fetch` is the only
// thing stubbed.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { NeedsPartsDialog } from './NeedsPartsDialog';

const workOrder = {
  workOrderID: 'wo-1',
  sourceID: 'REP-1',
  source: { clientName: 'Jane Doe' },
};

const RESULTS = [
  { itemNumber: '1234:112233:P', description: 'Half Shank, 14K White', unitCost: 42.5 },
  { itemNumber: '9876:445566:P', description: 'Half Shank, 14K Yellow', unitCost: 41.25 },
];

/** The dialog's one network call during a search. */
function stubSearch(payload, { ok = true } = {}) {
  global.fetch = vi.fn(async (url) => {
    expect(String(url)).toContain('/api/stuller/search?q=');
    return { ok, json: async () => payload };
  });
}

const open = () => render(
  <NeedsPartsDialog workOrder={workOrder} onClose={vi.fn()} onMoved={vi.fn()} onError={vi.fn()} />,
);

const searchBox = () => screen.getByLabelText('Search Stuller');
// Exact, not a regex: the Material Source select also carries the option "Stuller part number".
const partNumberBox = () => screen.getByLabelText('Stuller Part Number');

beforeEach(() => { global.fetch = vi.fn(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('finding a part at the bench', () => {
  it('searches the catalogue and lists what came back', async () => {
    stubSearch({ success: true, results: RESULTS });
    open();

    fireEvent.change(searchBox(), { target: { value: 'half shank 14k' } });
    fireEvent.click(screen.getByRole('button', { name: /^Search$/i }));

    expect(await screen.findByText('Half Shank, 14K White')).toBeInTheDocument();
    expect(screen.getByText('Half Shank, 14K Yellow')).toBeInTheDocument();
    // The number and the cost are what tell two near-identical parts apart.
    expect(screen.getByText(/1234:112233:P · \$42\.50/)).toBeInTheDocument();
  });

  it('fills the part number when a result is picked — the whole point', async () => {
    stubSearch({ success: true, results: RESULTS });
    open();

    fireEvent.change(searchBox(), { target: { value: 'half shank' } });
    fireEvent.click(screen.getByRole('button', { name: /^Search$/i }));
    fireEvent.click(await screen.findByText('Half Shank, 14K Yellow'));

    await waitFor(() => expect(partNumberBox()).toHaveValue('9876:445566:P'));
  });

  it('still takes a number typed from memory', () => {
    open();
    fireEvent.change(partNumberBox(), { target: { value: '1111:222222:P' } });
    expect(partNumberBox()).toHaveValue('1111:222222:P');
    // Nothing was fetched: the search is an addition, not a gate.
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('searches on Enter, because that is what a search box does', async () => {
    stubSearch({ success: true, results: RESULTS });
    open();

    fireEvent.change(searchBox(), { target: { value: 'half shank' } });
    fireEvent.keyDown(searchBox(), { key: 'Enter' });

    expect(await screen.findByText('Half Shank, 14K White')).toBeInTheDocument();
  });

  it('says so when nothing matched, instead of showing an empty space', async () => {
    stubSearch({ success: true, results: [] });
    open();

    fireEvent.change(searchBox(), { target: { value: 'qqqq' } });
    fireEvent.click(screen.getByRole('button', { name: /^Search$/i }));

    expect(await screen.findByText(/Nothing matched/i)).toBeInTheDocument();
  });

  it('shows the failure rather than an empty list', async () => {
    stubSearch({ error: 'Stuller is unavailable.' }, { ok: false });
    open();

    fireEvent.change(searchBox(), { target: { value: 'half shank' } });
    fireEvent.click(screen.getByRole('button', { name: /^Search$/i }));

    expect(await screen.findByText('Stuller is unavailable.')).toBeInTheDocument();
  });

  it('will not search on an empty box', () => {
    open();
    expect(screen.getByRole('button', { name: /^Search$/i })).toBeDisabled();
  });
});
