// @vitest-environment jsdom
//
// React-19 render smoke test for the bench card + handoff dialog. Proves the component
// tree mounts and interacts under the installed React 19 / MUI 6 / emotion stack — the
// runtime layer the pure-logic tests can't reach. Heavy/refrakt + router imports are
// mocked so this stays a fast, deterministic unit test (the live 3D viewer is verified
// manually via the preview harness — jsdom has no WebGL).
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/viewers/GlbReviewModal', () => ({ default: () => null }));
vi.mock('@/app/dashboard/repairs/components/RepairThumbnail', () => ({ default: () => null }));

import BenchWorkCard from './BenchWorkCard';

const baseWO = {
  workOrderID: 'wo-1',
  sourceType: 'repair',
  sourceID: 'REP-1',
  discipline: 'bench_jewelry',
  benchQueue: 'in_progress',
  status: 'IN PROGRESS',
  assignedToUserID: 'u-me',
  assignedJeweler: 'Me',
  source: { kind: 'repair', clientName: 'Jane Doe', description: 'Resize + set stone' },
  tasks: [
    { name: 'Size ring', laborHours: 0.8 },
    { name: 'Set stone', laborHours: 0.4 },
  ],
};

const renderCard = (props = {}) => render(
  <BenchWorkCard
    wo={baseWO}
    currentUserID="u-me"
    isAdmin={false}
    jewelers={[{ userID: 'u-v', firstName: 'Vernon' }]}
    busy={false}
    onAction={props.onAction || vi.fn()}
    {...props}
  />,
);

beforeEach(() => cleanup());

describe('BenchWorkCard (React 19 render smoke)', () => {
  it('mounts and renders the repair work-order card', () => {
    renderCard();
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();      // source title
    expect(screen.getByText('Bench')).toBeInTheDocument();          // lane chip
    expect(screen.getByText(/Size ring/)).toBeInTheDocument();      // task list
    expect(screen.getByRole('button', { name: /Move to QC/i })).toBeInTheDocument();
  });

  it('opens the sign-off & hand-off dialog and lists the uncredited tasks', () => {
    renderCard();
    fireEvent.click(screen.getByRole('button', { name: /Sign off & hand off/i }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Check the tasks you completed/i)).toBeInTheDocument();
    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(2);
  });

  it('submitting all-checked routes to QC (handoff action with both tasks, no target)', () => {
    const onAction = vi.fn();
    renderCard({ onAction });
    fireEvent.click(screen.getByRole('button', { name: /Sign off & hand off/i }));
    const dialog = screen.getByRole('dialog');
    within(dialog).getAllByRole('checkbox').forEach((cb) => fireEvent.click(cb));
    // All uncredited tasks checked → the action button becomes "send to QC".
    const submit = within(dialog).getByRole('button', { name: /send to QC/i });
    fireEvent.click(submit);
    expect(onAction).toHaveBeenCalledWith(
      baseWO,
      'handoff',
      { completedTaskIndexes: [0, 1], assignToUserID: null },
    );
  });

  // repair-86f66304: one custom labor line "Laser weld ×20", the assignee did 10 of them.
  const splitWO = {
    ...baseWO,
    tasks: [
      { title: 'Set stone', laborHours: 0.2, quantity: 10, completedByUserID: 'u-me', completedByName: 'Me' },
      { title: 'Laser weld', isCustomLabor: true, laborHours: 0.2, quantity: 20, price: 15 },
    ],
  };

  it('offers sign-off on a single remaining multi-quantity task and shows qty + total hours', () => {
    renderCard({ wo: splitWO });
    expect(screen.getByText(/×20/)).toBeInTheDocument();
    expect(screen.getByText(/· 4h/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign off & hand off/i })).toBeInTheDocument();
  });

  it('signing off part of a task sends completedQuantities and does NOT route to QC', () => {
    const onAction = vi.fn();
    renderCard({ wo: splitWO, onAction });
    fireEvent.click(screen.getByRole('button', { name: /Sign off & hand off/i }));
    const dialog = screen.getByRole('dialog');
    // The stone-setting line is already stamped → only the weld line is a checkbox.
    const boxes = within(dialog).getAllByRole('checkbox');
    expect(boxes).toHaveLength(1);
    fireEvent.click(boxes[0]);
    const qty = within(dialog).getByLabelText(/Quantity done for Laser weld/i);
    fireEvent.change(qty, { target: { value: '10' } });
    expect(within(dialog).getByText(/10 left for the next jeweler/i)).toBeInTheDocument();
    // Partial → hand-off, never "send to QC".
    expect(within(dialog).queryByRole('button', { name: /send to QC/i })).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: /^Sign off & hand off$/i }));
    expect(onAction).toHaveBeenCalledWith(
      splitWO,
      'handoff',
      { completedTaskIndexes: [1], completedQuantities: { 1: 10 }, assignToUserID: null },
    );
  });
});
