import { describe, it, expect } from 'vitest';
import {
  PIPELINE_STAGE,
  pipelineStage,
  workOrderLabor,
  buildLaborPipelineReport,
} from './laborPipeline';

const RATES = new Map([['u-bench', 30], ['u-senior', 38]]);
const SHOP_RATE = 50;
const opts = { rateFor: (id) => RATES.get(id) || 0, shopRate: SHOP_RATE };

const repairWO = (over = {}) => ({
  workOrderID: 'wo-r1', sourceType: 'repair', sourceID: 'REP-1', discipline: 'bench_jewelry',
  status: 'READY FOR WORK', assignedToUserID: null, tasks: [], ...over,
});
const pieceWO = (over = {}) => ({
  workOrderID: 'wo-p1', sourceType: 'production_piece', sourceID: 'p-1', discipline: 'cad',
  status: 'IN PROGRESS', assignedToUserID: 'u-bench', tasks: [], flatFee: 0, ...over,
});

describe('which bucket a job is in', () => {
  it('reads the bench queue rather than inventing its own status rules', () => {
    expect(pipelineStage(repairWO({ status: 'READY FOR WORK' }))).toBe(PIPELINE_STAGE.UNCLAIMED);
    expect(pipelineStage(repairWO({ status: 'IN PROGRESS', assignedToUserID: 'u-bench' }))).toBe(PIPELINE_STAGE.IN_PROGRESS);
    expect(pipelineStage(repairWO({ status: 'NEEDS PARTS' }))).toBe(PIPELINE_STAGE.BLOCKED);
    expect(pipelineStage(repairWO({ status: 'QUALITY CONTROL' }))).toBe(PIPELINE_STAGE.QC);
    expect(pipelineStage(pieceWO({ assignedToUserID: null, status: 'READY FOR WORK' }))).toBe(PIPELINE_STAGE.UNCLAIMED);
  });

  it('drops work that is off the bench — a finished job is not pipeline', () => {
    expect(pipelineStage(repairWO({ status: 'READY FOR PICKUP' }))).toBeNull();
    expect(pipelineStage(pieceWO({ status: 'COMPLETED' }))).toBeNull();
    expect(pipelineStage(pieceWO({ status: 'CANCELLED' }))).toBeNull();
  });
});

describe('what an open work order will cost', () => {
  it('prices an unclaimed repair at the shop rate, and flags it as a guess', () => {
    const wo = repairWO({ tasks: [{ laborHours: 0.5, quantity: 2 }, { laborHours: 1 }] });
    expect(workOrderLabor(wo, opts)).toEqual({ hours: 2, value: 100, estimated: true, flatFee: 0 });
  });

  it('prices a claimed repair at THAT jeweler’s credited rate, not the shop rate', () => {
    const wo = repairWO({ status: 'IN PROGRESS', assignedToUserID: 'u-bench', tasks: [{ laborHours: 2 }] });
    // 2h × $30 (his ladder rate) — not 2 × $50, which is what the customer is priced from.
    expect(workOrderLabor(wo, opts)).toMatchObject({ hours: 2, value: 60, estimated: false });
  });

  it('prices signed-off tasks at the rate captured at sign-off and the rest as forecast', () => {
    const wo = repairWO({
      status: 'IN PROGRESS',
      assignedToUserID: 'u-bench',
      tasks: [
        { laborHours: 1, completedByUserID: 'u-senior', laborRateSnapshot: 38 },
        { laborHours: 2 },
      ],
    });
    // 1h already earned by the senior at his snapshot (38) + 2h still to do by the assignee (30).
    expect(workOrderLabor(wo, opts)).toMatchObject({ hours: 3, value: 98, estimated: false });
  });

  it('counts a CAD flat fee in full and calls it exact', () => {
    const wo = pieceWO({ assignedToUserID: null, tasks: [], flatFee: 150 });
    expect(workOrderLabor(wo, opts)).toEqual({ hours: 0, value: 150, estimated: false, flatFee: 150 });
  });

  it('prices piece work off estLaborHours', () => {
    const wo = pieceWO({ discipline: 'bench_jewelry', tasks: [{ estLaborHours: 1.5 }, { estLaborHours: 0.5 }] });
    expect(workOrderLabor(wo, opts)).toMatchObject({ hours: 2, value: 60 });
  });
});

describe('the shop at a glance', () => {
  const now = new Date('2026-09-23T12:00:00Z'); // a Wednesday

  const base = () => ({
    workOrders: [
      repairWO({ workOrderID: 'wo-1', tasks: [{ laborHours: 2 }] }),                                    // unclaimed: 2h @ 50 = 100
      repairWO({ workOrderID: 'wo-2', status: 'IN PROGRESS', assignedToUserID: 'u-bench', tasks: [{ laborHours: 3 }] }), // 3h @ 30 = 90
      repairWO({ workOrderID: 'wo-3', status: 'NEEDS PARTS', tasks: [{ laborHours: 1 }] }),              // blocked: 50
      repairWO({ workOrderID: 'wo-4', status: 'READY FOR PICKUP', tasks: [{ laborHours: 9 }] }),         // off bench
      pieceWO({ workOrderID: 'wo-5', discipline: 'cad', assignedToUserID: 'u-senior', flatFee: 200 }),   // 200 exact
    ],
    pendingQcLogs: [],
    candidates: [],
    batches: [],
    rateByUserID: RATES,
    shopRate: SHOP_RATE,
    now,
  });

  it('separates unclaimed from claimed, and leaves finished work out', () => {
    const { summary } = buildLaborPipelineReport(base());
    expect(summary.unclaimedCount).toBe(1);
    expect(summary.unclaimedValue).toBe(100);
    expect(summary.claimedCount).toBe(2);
    expect(summary.claimedValue).toBe(290); // 90 + 200
    expect(summary.blockedValue).toBe(50);
    expect(summary.openCount).toBe(4);      // the picked-up repair is not pipeline
    expect(summary.openValue).toBe(440);
  });

  it('never counts a piece twice once its QC labor is already on the books', () => {
    const input = base();
    input.workOrders.push(pieceWO({ workOrderID: 'wo-6', status: 'QC', assignedToUserID: 'u-bench', tasks: [{ estLaborHours: 4 }] }));
    // Piece work orders write their labor log at MOVE TO QC, so this one is already committed.
    input.pendingQcLogs = [{ workOrderID: 'wo-6', creditedValue: 120, creditedLaborHours: 4 }];

    const { summary, rows } = buildLaborPipelineReport(input);
    expect(rows.some((r) => r.workOrderID === 'wo-6')).toBe(false);
    expect(summary.heldInQc).toBe(120);
    expect(summary.openValue).toBe(440); // unchanged — the log replaced the forecast
    expect(summary.totalCommitted).toBe(560);
  });

  it('adds up what payroll will actually be asked for', () => {
    const input = base();
    input.pendingQcLogs = [{ workOrderID: 'wo-x', creditedValue: 75, creditedLaborHours: 2.5 }];
    input.candidates = [{ userID: 'u-bench', userName: 'Vernon', laborPay: 120, salePay: 30, totalPay: 150 }];
    input.batches = [
      { batchID: 'b-1', userID: 'u-senior', status: 'finalized', laborPay: 200, totalPay: 200 },
      { batchID: 'b-2', userID: 'u-bench', status: 'paid', totalPay: 400, paidAt: new Date('2026-09-21T10:00:00Z') },
      { batchID: 'b-3', userID: 'u-bench', status: 'paid', totalPay: 999, paidAt: new Date('2026-09-14T10:00:00Z') },
    ];

    const { summary } = buildLaborPipelineReport(input);
    // 120 labor, NOT 150 — the $30 sale payout rides in the same batch but is not bench work.
    expect(summary.unbatchedPayable).toBe(120);
    expect(summary.finalizedUnpaid).toBe(200);
    expect(summary.owedNow).toBe(320);
    expect(summary.paidThisWeek).toBe(400); // last week's 999 stays out
    expect(summary.totalCommitted).toBe(835); // 320 owed + 75 held + 440 open
  });

  it('shows each jeweler their load and what they are owed, and never charges anyone for unclaimed work', () => {
    const input = base();
    input.candidates = [{ userID: 'u-bench', userName: 'Vernon', laborPay: 120, totalPay: 120 }];

    const { byPerson } = buildLaborPipelineReport(input);
    const vernon = byPerson.find((p) => p.userID === 'u-bench');
    expect(vernon).toMatchObject({ openCount: 1, openHours: 3, openValue: 90, owedNow: 120, rate: 30 });
    // The unclaimed ticket belongs to nobody until somebody takes it.
    expect(byPerson.reduce((s, p) => s + p.openValue, 0)).toBe(290);
  });

  it('flags rush work and what is due before the week is out', () => {
    const input = base();
    input.workOrders.push(repairWO({
      workOrderID: 'wo-7', isRush: true, promiseDate: new Date('2026-09-25T00:00:00Z'), tasks: [{ laborHours: 1 }],
    }));
    input.workOrders.push(repairWO({
      workOrderID: 'wo-8', promiseDate: new Date('2026-10-20T00:00:00Z'), tasks: [{ laborHours: 1 }],
    }));

    const { summary, rows } = buildLaborPipelineReport(input);
    expect(summary.rushCount).toBe(1);
    expect(summary.dueThisWeekCount).toBe(1);
    expect(summary.dueThisWeekValue).toBe(50);
    expect(rows[0].workOrderID).toBe('wo-7'); // rush first, so the list reads like the bench does
  });

  it('breaks the load down by discipline, which is how you know who to call', () => {
    const { byDiscipline } = buildLaborPipelineReport(base());
    expect(byDiscipline.find((d) => d.discipline === 'cad')).toMatchObject({ count: 1, value: 200 });
    expect(byDiscipline.find((d) => d.discipline === 'bench_jewelry')).toMatchObject({ count: 3, value: 240 });
  });

  /**
   * "I just entered 20-something jobs, they haven't been claimed, and I'm trying to see how much it's
   * going to be" (owner, 2026-09-28). Labor cost answers what the shop PAYS; this answers what the
   * tickets are WORTH, which is the question a bench full of fresh tickets actually raises.
   */
  describe('what the open work is worth', () => {
    const withTickets = () => ({
      ...base(),
      ticketValueBySource: new Map([
        ['repair:REP-1', 260],   // wo-1, unclaimed
        ['repair:REP-2', 180],   // wo-2, on a bench
        ['repair:REP-3', 95],    // wo-3, blocked
        ['repair:REP-4', 9999],  // wo-4 is off the bench — must not be counted
      ]),
      workOrders: base().workOrders.map((wo, i) => ({ ...wo, sourceID: `REP-${i + 1}` })),
    });

    it('totals the tickets, and tells you what is still unpriced rather than calling it $0', () => {
      const { summary } = buildLaborPipelineReport(withTickets());
      expect(summary.openRevenue).toBe(535);        // 260 + 180 + 95 — the picked-up job stays out
      expect(summary.unclaimedRevenue).toBe(260);
      expect(summary.claimedRevenue).toBe(180);
      // The CAD piece has no ticket value: counted as unpriced, never as zero revenue.
      expect(summary.revenueUnknownCount).toBe(1);
    });

    it('shows what is left after the bench is paid', () => {
      const { summary } = buildLaborPipelineReport(withTickets());
      expect(summary.openValue).toBe(440);
      expect(summary.openMargin).toBe(95);          // 535 billed − 440 of labor
    });

    it('counts a ticket once even when it is spread over several work orders', () => {
      const input = withTickets();
      // A repair handed from the bench to engraving is two work orders on ONE ticket.
      input.workOrders.push(repairWO({ workOrderID: 'wo-1b', sourceID: 'REP-1', discipline: 'engraving', tasks: [{ laborHours: 1 }] }));

      const { summary, rows } = buildLaborPipelineReport(input);
      expect(summary.openRevenue).toBe(535);        // not 795
      const second = rows.find((r) => r.workOrderID === 'wo-1b');
      expect(second).toMatchObject({ revenue: 0, revenueKnown: true, revenueCountedElsewhere: true });
    });

    it('reports no revenue at all when no ticket values are supplied', () => {
      const { summary } = buildLaborPipelineReport(base());
      expect(summary.openRevenue).toBe(0);
      expect(summary.revenueUnknownCount).toBe(4);
    });
  });
});
