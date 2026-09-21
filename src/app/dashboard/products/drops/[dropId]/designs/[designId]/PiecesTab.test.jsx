// @vitest-environment jsdom
//
// Render test for the Pieces tab — the first surface in admin that can create a piece at all.
// Proves the tree mounts under React 19 / MUI 6, that the edition guard actually blocks, and
// above all that the request it sends is a PREMADE intake: the difference between recording a
// piece that exists and spawning work orders for labor nobody performed is one field in this body.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import PiecesTab from './PiecesTab';

const design = (over = {}) => ({
  designID: 'd1',
  defaultVariantId: 'v1',
  variants: [{ variantId: 'v1', label: '14k Yellow', active: true }],
  edition: { type: 'one_of_one', allocated: 0, committed: 0, nextNumber: 1 },
  ...over,
});

const piece = (over = {}) => ({
  pieceID: 'p1',
  editionNumber: 1,
  status: 'available',
  metalType: 'silver',
  karat: '925',
  ringSize: '7',
  totalCOGS: 90,
  pricing: { retailPrice: 320 },
  provenance: { kind: 'premade' },
  ...over,
});

const mockFetch = (pieces = []) => {
  const fetchMock = vi.fn((url, opts) => {
    if (opts?.method === 'POST') {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ pieceID: 'new' }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve(pieces) });
  });
  global.fetch = fetchMock;
  return fetchMock;
};

beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); });

describe('PiecesTab', () => {
  it('tells an empty design it is made to order, and offers to record one that exists', async () => {
    mockFetch([]);
    render(<PiecesTab design={design()} designId="d1" notify={vi.fn()} />);

    expect(await screen.findByText(/No physical pieces yet/i)).toBeInTheDocument();
    expect(screen.getByText(/A design with no pieces is made to order/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Record existing piece/i })).toBeEnabled();
  });

  it('lists a recorded piece with its number, metal, cost and price', async () => {
    mockFetch([piece()]);
    render(<PiecesTab design={design({ edition: { type: 'one_of_one', allocated: 1, committed: 0 } })} designId="d1" notify={vi.fn()} />);

    expect(await screen.findByText('#1')).toBeInTheDocument();
    expect(screen.getByText(/silver · 925 · size 7/i)).toBeInTheDocument();
    expect(screen.getByText('$90.00')).toBeInTheDocument();
    expect(screen.getByText('$320.00')).toBeInTheDocument();
    expect(screen.getByText('Premade')).toBeInTheDocument();
  });

  it('blocks recording another piece once the edition is spent', async () => {
    // The server refuses this too; saying so before the form is filled in is the point.
    mockFetch([piece()]);
    render(<PiecesTab design={design({ edition: { type: 'one_of_one', allocated: 1, committed: 0 } })} designId="d1" notify={vi.fn()} />);

    await screen.findByText('#1');
    expect(screen.getByRole('button', { name: /Record existing piece/i })).toBeDisabled();
    expect(screen.getByText(/This edition is fully allocated/i)).toBeInTheDocument();
  });

  it('leaves the button open for an unlimited edition', async () => {
    mockFetch([piece()]);
    render(<PiecesTab design={design({ edition: { type: 'unlimited', allocated: 4 } })} designId="d1" notify={vi.fn()} />);

    await screen.findByText('#1');
    expect(screen.getByRole('button', { name: /Record existing piece/i })).toBeEnabled();
  });

  it('sends a PREMADE intake — no work orders — carrying the entered facts', async () => {
    const fetchMock = mockFetch([]);
    const notify = vi.fn();
    render(<PiecesTab design={design()} designId="d1" notify={notify} />);

    fireEvent.click(await screen.findByRole('button', { name: /Record existing piece/i }));
    fireEvent.change(screen.getByLabelText(/Karat \/ purity/i), { target: { value: '925' } });
    fireEvent.change(screen.getByLabelText(/Ring size/i), { target: { value: '7' } });
    fireEvent.change(screen.getByLabelText(/What it cost you/i), { target: { value: '90' } });
    fireEvent.change(screen.getByLabelText(/Selling price/i), { target: { value: '320' } });
    fireEvent.click(screen.getByRole('button', { name: /^Record piece$/i }));

    await waitFor(() => {
      const post = fetchMock.mock.calls.find(([, opts]) => opts?.method === 'POST');
      expect(post).toBeTruthy();
      const body = JSON.parse(post[1].body);
      // The field that keeps this from spawning work orders for work done elsewhere.
      expect(body.premade).toBe(true);
      expect(body.designID).toBe('d1');
      expect(body.variantId).toBe('v1');
      expect(body.karat).toBe('925');
      expect(body.ringSize).toBe('7');
      expect(body.cost).toBe('90');
      expect(body.retailPrice).toBe('320');
    });
    await waitFor(() => expect(notify).toHaveBeenCalledWith(expect.stringMatching(/recorded/i)));
  });

  it('surfaces a refusal from the server instead of reporting success', async () => {
    global.fetch = vi.fn((url, opts) => (opts?.method === 'POST'
      ? Promise.resolve({ ok: false, json: () => Promise.resolve({ error: 'edition capacity exhausted' }) })
      : Promise.resolve({ ok: true, json: () => Promise.resolve([]) })));
    const notify = vi.fn();
    render(<PiecesTab design={design()} designId="d1" notify={notify} />);

    fireEvent.click(await screen.findByRole('button', { name: /Record existing piece/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Record piece$/i }));

    expect(await screen.findByText(/edition capacity exhausted/i)).toBeInTheDocument();
    expect(notify).not.toHaveBeenCalledWith(expect.stringMatching(/recorded/i));
  });
});
