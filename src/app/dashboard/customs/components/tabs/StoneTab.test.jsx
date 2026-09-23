// @vitest-environment jsdom
//
// The Stone tab's whole point is WHERE the cutter comes from (owner, 2026-09-23: "he gets added as an
// artisan on the custom order. there are tabs in the custom order to fit the custom stone into the
// order"). A dialog that let an admin pick any gem cutter in the shop was the shape that got rejected,
// so these tests hold the corrected one: the cutter list IS the order's stone assignments, and with
// nobody assigned the tab says where to go rather than offering a free pick.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import StoneTab from './StoneTab';

const ORDER = {
  customID: 'CO-1',
  assignments: [
    { id: 'a-1', userID: 'u-cad', name: 'Jacob Engel', role: 'cad' },
    { id: 'a-2', userID: 'u-cut', name: 'Jacob West', role: 'stone' },
  ],
  quote: { centerstone: { item: '1.5ct Marquise Citrine', cost: 1250, sourcePieceID: 'p-stone' } },
};

const STONE = {
  pieceID: 'p-stone', designID: 'd-stone', name: '1.5ct Marquise Golden Citrine',
  spec: { sizeMode: 'carat', carat: 1.5, cut: ['Marquise'], color: 'Golden' },
  stonePrice: { amount: 1250 }, status: 'PLANNED',
};

beforeEach(() => {
  global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ stones: [STONE] }) }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const openDialog = async () => {
  fireEvent.click(screen.getByRole('button', { name: /add a stone/i }));
  return screen.findByRole('dialog');
};

describe('StoneTab', () => {
  it('lists the order’s stone cutters — and not its CAD designer', async () => {
    render(<StoneTab customID="CO-1" order={ORDER} />);
    await screen.findByText('1.5ct Marquise Golden Citrine');

    expect(screen.getByText('Jacob West')).toBeInTheDocument();
    expect(screen.queryByText('Jacob Engel')).not.toBeInTheDocument();
  });

  it('shows whether the stone is fitted into the quote yet', async () => {
    render(<StoneTab customID="CO-1" order={ORDER} />);
    expect(await screen.findByText('on the quote')).toBeInTheDocument();

    cleanup();
    render(<StoneTab customID="CO-1" order={{ ...ORDER, quote: { centerstone: {} } }} />);
    expect(await screen.findByText('not on the quote')).toBeInTheDocument();
  });

  it('defaults the cut to the one cutter on the order', async () => {
    render(<StoneTab customID="CO-1" order={ORDER} />);
    await screen.findByText('1.5ct Marquise Golden Citrine');

    const dialog = await openDialog();
    expect(within(dialog).getByText('Jacob West')).toBeInTheDocument();
  });

  it('points at the Assignment tab when no cutter is on the order', async () => {
    render(<StoneTab customID="CO-1" order={{ ...ORDER, assignments: [] }} />);
    await screen.findByText('1.5ct Marquise Golden Citrine');

    expect(screen.getByText(/Assignment tab as a Stone Cutter/i)).toBeInTheDocument();
  });

  it('sends the price to the stone, which is what writes the quote’s centre stone', async () => {
    render(<StoneTab customID="CO-1" order={ORDER} />);
    await screen.findByText('1.5ct Marquise Golden Citrine');

    fireEvent.change(screen.getByLabelText(/stone price/i), { target: { value: '1400' } });
    fireEvent.click(screen.getByRole('button', { name: /update price/i }));

    await waitFor(() => expect(global.fetch.mock.calls.some((c) => c[1]?.method === 'PATCH')).toBe(true));
    const call = global.fetch.mock.calls.find((c) => c[1]?.method === 'PATCH');
    expect(call[0]).toBe('/api/custom-orders/CO-1/stones/p-stone');
    expect(JSON.parse(call[1].body)).toEqual({ price: 1400 });
  });
});
