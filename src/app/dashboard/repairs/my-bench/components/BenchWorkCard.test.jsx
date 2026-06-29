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
});
