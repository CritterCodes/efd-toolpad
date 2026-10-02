// @vitest-environment jsdom
//
// The Field rows on a repair card, rendered.
//
// Three screens share this grid — Repairs by Period, a client's Repairs tab and a wholesale account's —
// and it shipped in #271 without a render, because `efd-database-DEV` has no repairs to put in it. This
// runs it instead.
//
// The interesting case is the missing date. It used to read `{repair.promiseDate || 'N/A'}`, which puts
// "N/A" in the same type as a real date and leaves the reader to notice the difference. `Field` renders an
// em dash in a dimmer colour, so an absent value looks absent.
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import RepairsGrid from './repairGrid';

const repair = {
  repairID: 'REP-1001',
  description: 'Resize to 7',
  clientName: 'Jane Doe',
  promiseDate: '2026-10-09',
  status: 'COMPLETED',
};

const show = (repairs = [repair]) => render(<RepairsGrid repairs={repairs} />);

afterEach(cleanup);

describe('a repair card', () => {
  it('labels the client and the date in their own voice', () => {
    show();
    expect(screen.getByText('Client')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Due')).toBeInTheDocument();
    expect(screen.getByText('2026-10-09')).toBeInTheDocument();
  });

  it('shows an absent date as absent, not as the string "N/A"', () => {
    show([{ ...repair, promiseDate: null }]);
    expect(screen.getByText('Due')).toBeInTheDocument();
    expect(screen.queryByText('N/A')).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('still opens the repair, which is what the card is for', () => {
    show();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/dashboard/repairs/REP-1001');
  });

  it('renders a page of cards without one swallowing the next', () => {
    show([repair, { ...repair, repairID: 'REP-1002', clientName: 'Sam Smith' }]);
    expect(screen.getAllByText('Client')).toHaveLength(2);
    expect(screen.getByText('Sam Smith')).toBeInTheDocument();
  });
});
