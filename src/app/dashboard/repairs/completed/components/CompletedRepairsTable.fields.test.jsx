// @vitest-environment jsdom
//
// The Field rows on a finished ticket, rendered.
//
// These shipped in #271 on a build plus an identical-shape argument, because `efd-database-DEV` holds the
// six `views.check` users and no repairs — there is nothing to expand in a browser. That was the wrong
// trade: this repo has `@testing-library/react` and a jsdom environment, so the component can simply be
// run. Written afterwards rather than never.
//
// What is worth pinning: a label and its value are separate elements (which is the whole change — they can
// now look different), the phone-only cost row stays phone-only, and an absent note leaves no labelled
// blank.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { CompletedRepairsTable } from './CompletedRepairsTable';

const repair = {
  _id: 'r1',
  repairNumber: '1001',
  repairID: 'REP-1001',
  clientFirstName: 'Jane',
  clientLastName: 'Doe',
  status: 'COMPLETED',
  repairDescription: 'Resize to 7, retip four prongs',
  notes: 'Customer wants it by Friday',
  totalCost: 182.5,
};

const show = (props = {}) => render(
  <CompletedRepairsTable
    repairs={[repair]}
    isMobile={false}
    expandedRows={new Set(['r1'])}
    toggleRowExpansion={vi.fn()}
    handleViewRepair={vi.fn()}
    {...props}
  />,
);

afterEach(cleanup);

describe('the row that expands under a finished ticket', () => {
  it('puts the label and the value in different elements, which is the whole change', () => {
    show();
    const label = screen.getByText('Item description');
    const value = screen.getByText('Resize to 7, retip four prongs');
    expect(label).not.toBe(value);
    // Not nested either: a label wrapping its value cannot be given its own voice.
    expect(label.contains(value)).toBe(false);
    expect(value.contains(label)).toBe(false);
  });

  it('shows the note when there is one', () => {
    show();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(screen.getByText('Customer wants it by Friday')).toBeInTheDocument();
  });

  it('leaves no labelled blank when there is no note', () => {
    show({ repairs: [{ ...repair, notes: '' }] });
    expect(screen.queryByText('Notes')).not.toBeInTheDocument();
  });

  it('carries the cost on a phone, where the table has no column for it', () => {
    show({ isMobile: true });
    expect(screen.getByText('Total cost')).toBeInTheDocument();
    expect(screen.getByText('$182.50')).toBeInTheDocument();
  });

  it('does not repeat the cost at desktop width, where the column already shows it', () => {
    show({ isMobile: false });
    expect(screen.queryByText('Total cost')).not.toBeInTheDocument();
  });

  it('renders none of the detail until the row is expanded', () => {
    show({ expandedRows: new Set() });
    // Collapse unmounts its children, so the facts are absent rather than merely hidden.
    expect(screen.queryByText('Item description')).not.toBeInTheDocument();
  });

  it('falls back to the other description field the data has carried for years', () => {
    show({ repairs: [{ ...repair, repairDescription: '', itemDescription: 'Gold band, 6mm' }] });
    expect(screen.getByText('Gold band, 6mm')).toBeInTheDocument();
  });
});
