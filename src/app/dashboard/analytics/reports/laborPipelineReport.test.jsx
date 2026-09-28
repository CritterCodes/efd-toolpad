// @vitest-environment jsdom
//
// The Labor Pipeline report, rendered the way an owner opens it. A report is three separate pieces of
// wiring — a definition, a `buildReportConfig` case, and the shape the API actually returns — and a
// typo in any one of them shows up as an empty page rather than an error, so this renders the real
// client against a real-shaped payload.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import ReportDetailPageClient from './ReportDetailPageClient';
import { getReportDefinition } from './reportDefinitions';

const LABOR_PIPELINE = {
  summary: {
    unclaimedCount: 3, unclaimedHours: 6, unclaimedValue: 300,
    claimedCount: 2, claimedHours: 4, claimedValue: 140,
    blockedCount: 1, blockedValue: 50,
    qcCount: 1, qcValue: 60,
    openCount: 7, openHours: 11, openValue: 550,
    rushCount: 1, dueThisWeekCount: 2, dueThisWeekValue: 180,
    heldInQc: 75, heldHours: 2.5, heldCount: 1,
    unbatchedPayable: 120, finalizedUnpaid: 200, owedNow: 320,
    paidThisWeek: 400, totalCommitted: 945,
    weekStart: '2026-09-21T00:00:00.000Z', weekEnd: '2026-09-27T23:59:59.999Z',
  },
  byStage: [
    { id: 'unclaimed', stage: 'unclaimed', stageLabel: 'Unclaimed', count: 3, hours: 6, value: 300, estimatedValue: 300, rushCount: 0, dueThisWeekCount: 1, dueThisWeekValue: 100 },
    { id: 'in_progress', stage: 'in_progress', stageLabel: 'On a bench', count: 2, hours: 4, value: 140, estimatedValue: 0, rushCount: 1, dueThisWeekCount: 1, dueThisWeekValue: 80 },
  ],
  byPerson: [
    { id: 'u-bench', userID: 'u-bench', userName: 'Vernon', rate: 30, openCount: 2, openHours: 4, openValue: 140, qcValue: 0, owedNow: 120 },
  ],
  byDiscipline: [
    { discipline: 'bench_jewelry', count: 6, hours: 11, value: 490, estimatedValue: 300, rushCount: 1, dueThisWeekCount: 2, dueThisWeekValue: 180 },
  ],
  rows: [
    {
      id: 'wo-1', workOrderID: 'wo-1', stage: 'unclaimed', stageLabel: 'Unclaimed', title: 'Size down 2 sizes',
      sourceType: 'repair', sourceID: 'REP-1', discipline: 'bench_jewelry', assignedToUserID: '', assignedJeweler: '',
      hours: 2, value: 100, estimated: true, isRush: true, promiseDate: '2026-09-25T00:00:00.000Z', dueThisWeek: true,
    },
  ],
};

beforeEach(() => {
  global.fetch = vi.fn(async (url) => ({
    ok: true,
    json: async () => (String(url).includes('/api/analytics/reports')
      ? { filters: {}, baseline: {}, laborPipeline: LABOR_PIPELINE }
      : { filters: {} }),
  }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

// Every section renders twice — a stacked card list for phones and a table for desktop, both in the
// DOM with only CSS hiding one. So "find the text" is ambiguous by construction; these scope to the
// summary card, or to the desktop table row, on purpose.
const card = (label) => screen.getAllByText(label)
  .map((el) => el.closest('.MuiCardContent-root'))
  .find((el) => el && el.firstChild?.textContent === label);
const tableRow = (text) => screen.getAllByText(text).map((el) => el.closest('tr')).find(Boolean);
const loaded = () => screen.findByText('Total committed labor');

describe('Labor Pipeline report', () => {
  it('is a listed report so it shows up on the reports index', () => {
    expect(getReportDefinition('labor-pipeline')).toMatchObject({ title: 'Labor Pipeline Report', source: 'reports' });
  });

  it('leads with what is unclaimed, what is on a bench, and what payroll owes', async () => {
    render(<ReportDetailPageClient reportSlug="labor-pipeline" />);
    await loaded();

    expect(within(card('Unclaimed')).getByText('$300.00')).toBeInTheDocument();
    expect(within(card('On a bench')).getByText('$140.00')).toBeInTheDocument();
    expect(within(card('Labor owed now')).getByText('$320.00')).toBeInTheDocument();
    expect(within(card('Total committed labor')).getByText('$945.00')).toBeInTheDocument();
    // QC + held is computed on the page, not a field: 60 still on the bench + 75 already credited.
    expect(within(card('In QC + held')).getByText('$135.00')).toBeInTheDocument();
    expect(screen.getByText(/3 jobs · 6.00 h · nobody has taken these/)).toBeInTheDocument();
    // Owed-now is labor only; the note says where the number comes from.
    expect(within(card('Labor owed now')).getByText(/unbatched \+ \$200.00 finalized · labor only/)).toBeInTheDocument();
  });

  it('breaks the shop down by stage, by jeweler and by discipline', async () => {
    render(<ReportDetailPageClient reportSlug="labor-pipeline" />);
    await loaded();

    expect(screen.getByText('Where the Labor Is')).toBeInTheDocument();
    expect(within(tableRow('On a bench')).getByText('$140.00')).toBeInTheDocument();

    const vernon = tableRow('Vernon');
    expect(within(vernon).getByText('$30.00/h')).toBeInTheDocument();
    expect(within(vernon).getByText('$120.00')).toBeInTheDocument();          // owed now

    expect(within(tableRow('bench jewelry')).getByText('$490.00')).toBeInTheDocument();
  });

  it('marks a forecast as a forecast, and puts rush work at the top of the list', async () => {
    render(<ReportDetailPageClient reportSlug="labor-pipeline" />);
    await loaded();

    const job = tableRow(/🔴 Size down 2 sizes/);
    // An unclaimed job's cost depends on who takes it — the page has to say so.
    expect(within(job).getByText('$100.00 est.')).toBeInTheDocument();
    expect(within(job).getAllByText('Unclaimed').length).toBeGreaterThan(0); // stage + nobody assigned
    expect(within(job).getByText('repair REP-1')).toBeInTheDocument();
  });
});
