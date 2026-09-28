/**
 * Labor in the PIPELINE — what the shop still owes the bench, before any of it is earned.
 *
 * Everything labor-shaped in analytics until now has been retrospective, because a labor log is only
 * written when work passes QC (services/repairs/benchHandoff.js, services/bench/pieceWorkOrderActions.js).
 * So the Labor Report can say what was earned and the payroll page can say what is owed, but nothing
 * could answer the question an owner actually asks while entering a week's work: how much labour is
 * sitting in the shop right now, who is holding it, and what will it cost me by Friday.
 *
 * This builds that from the work orders themselves. The arithmetic is not new — it is the same
 * arithmetic QC runs at credit time (hours × the jeweler's ladder rate), just run FORWARD on work that
 * has not been credited yet.
 *
 * TWO KINDS OF NUMBER, never mixed:
 *
 *   FORECAST — open work orders. Hours come from the work order's own tasks; the rate is the assigned
 *              jeweler's credited rate, or the shop rate when nobody has claimed it yet. A forecast row
 *              says so (`estimated`), because an unclaimed job's cost genuinely depends on who takes it.
 *
 *   COMMITTED — labor already credited (logs) and not yet paid. Exact to the cent, and deliberately
 *               taken from the payroll layer's own filters rather than re-derived, so this report and
 *               the Wednesday funding check can never disagree about what is owed.
 *
 * DOUBLE COUNTING is the one real hazard here, and there are two places it could happen:
 *
 *   1. A repair's tasks are signed off per task as they are finished. A half-done repair therefore has
 *      credited-shaped hours (stamped, with their own rate snapshot) AND uncredited hours in the same
 *      work order. Both are counted, but separately and with the right rate for each.
 *   2. A piece work order writes its labor log at MOVE TO QC (`pendingQc: true`), so a piece sitting in
 *      QC is already committed. Its forecast is dropped when a log for that work order exists — the log
 *      is the better number, and counting both would bill the shop twice for one job.
 */
import { taskLaborHours, getUncreditedTaskIndexes, groupCompletedTasksByJeweler } from '@/app/api/repairLaborLogs/utils';
import { deriveWorkOrderQueue, BENCH_QUEUE } from '@/services/workOrders/workOrderWorkflow';
import { getPayrollWeekStart, getWeekEndFromStart, splitBatchPay, PAYROLL_BATCH_STATUS } from '@/services/payrollUtils';

/**
 * LABOR ONLY. Sale and consignment payouts ride in the same payroll batch but are not bench work, and
 * folding them in here would make a labor report answer a different question than the one it is asked.
 * splitBatchPay is the one place that knows how to separate them (a hand-summed laborPay + salePay
 * double-paid sale pay once already).
 */
const laborPay = (doc) => splitBatchPay(doc).laborPay;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const round2h = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** The buckets an owner reads the shop in. QC keeps its own bucket: it is done work, not future work. */
export const PIPELINE_STAGE = {
  UNCLAIMED: 'unclaimed',
  IN_PROGRESS: 'in_progress',
  BLOCKED: 'blocked',
  QC: 'qc',
};

export const STAGE_LABEL = {
  [PIPELINE_STAGE.UNCLAIMED]: 'Unclaimed',
  [PIPELINE_STAGE.IN_PROGRESS]: 'On a bench',
  [PIPELINE_STAGE.BLOCKED]: 'Blocked (parts / client)',
  [PIPELINE_STAGE.QC]: 'In QC',
};

/**
 * Which bucket an open work order is in, or null when it is off the bench entirely.
 * Reuses the bench's own queue derivation so this report and My Bench can never disagree about
 * what "unclaimed" means.
 */
export function pipelineStage(workOrder = {}) {
  switch (deriveWorkOrderQueue(workOrder)) {
    case BENCH_QUEUE.UNCLAIMED: return PIPELINE_STAGE.UNCLAIMED;
    case BENCH_QUEUE.IN_PROGRESS:
    case BENCH_QUEUE.MINE: return PIPELINE_STAGE.IN_PROGRESS;
    case BENCH_QUEUE.WAITING_PARTS:
    case BENCH_QUEUE.COMMUNICATIONS: return PIPELINE_STAGE.BLOCKED;
    case BENCH_QUEUE.QC: return PIPELINE_STAGE.QC;
    default: return null;
  }
}

/**
 * What one open work order is going to cost in labor.
 *
 * Repair-sourced work orders mirror the repair's `tasks[]`, which carry per-task hours and, once a
 * jeweler signs one off, the rate they will actually be credited at. Piece-sourced work orders carry
 * `tasks[].estLaborHours` plus, for CAD, a flat fee that is the whole of the pay.
 *
 * @param rateFor (userID) => number — the jeweler's credited rate; 0 when unknown.
 * @param shopRate fallback for work nobody has claimed.
 */
export function workOrderLabor(workOrder = {}, { rateFor = () => 0, shopRate = 0 } = {}) {
  const tasks = Array.isArray(workOrder.tasks) ? workOrder.tasks : [];
  const assignedRate = Number(rateFor(workOrder.assignedToUserID)) || 0;

  if (workOrder.sourceType === 'repair') {
    // Signed-off tasks are priced at the rate captured at sign-off — that IS what QC will credit.
    const signedOff = groupCompletedTasksByJeweler(workOrder);
    let hours = 0;
    let value = 0;
    let estimated = false;
    for (const group of signedOff) {
      const rate = group.rate > 0 ? group.rate : (Number(rateFor(group.userID)) || shopRate);
      if (!(group.rate > 0)) estimated = true;
      hours += group.hours;
      value += group.hours * rate;
    }
    // Whatever is left on the ticket is still a forecast: whoever finishes it sets its price.
    const remainingHours = getUncreditedTaskIndexes(workOrder)
      .reduce((sum, i) => sum + taskLaborHours(tasks[i] || {}), 0);
    if (remainingHours > 0) {
      const rate = assignedRate > 0 ? assignedRate : shopRate;
      if (!(assignedRate > 0)) estimated = true;
      hours += remainingHours;
      value += remainingHours * rate;
    }
    return { hours: round2h(hours), value: round2(value), estimated, flatFee: 0 };
  }

  const hours = tasks.reduce((sum, t) => sum + (Number(t?.estLaborHours) || 0), 0);
  const flatFee = Number(workOrder.flatFee) || 0;
  const rate = assignedRate > 0 ? assignedRate : shopRate;
  return {
    hours: round2h(hours),
    value: round2(hours * rate + flatFee),
    // A flat fee is exact; only hourly work priced off a fallback rate is a guess.
    estimated: hours > 0 && !(assignedRate > 0),
    flatFee: round2(flatFee),
  };
}

function emptyBucket() {
  return { count: 0, hours: 0, value: 0, estimatedValue: 0, rushCount: 0, dueThisWeekCount: 0, dueThisWeekValue: 0 };
}

function addToBucket(bucket, row) {
  bucket.count += 1;
  bucket.hours = round2h(bucket.hours + row.hours);
  bucket.value = round2(bucket.value + row.value);
  if (row.estimated) bucket.estimatedValue = round2(bucket.estimatedValue + row.value);
  if (row.isRush) bucket.rushCount += 1;
  if (row.dueThisWeek) {
    bucket.dueThisWeekCount += 1;
    bucket.dueThisWeekValue = round2(bucket.dueThisWeekValue + row.value);
  }
  return bucket;
}

/**
 * The whole picture.
 *
 * @param workOrders every work order (closed ones are filtered out here, by bench queue).
 * @param pendingQcLogs labor logs held until QC passes — committed, not yet payable.
 * @param candidates `listPayrollCandidates()` output: credited, unbatched, payable now.
 * @param batches payroll batches (finalized-unpaid = already owed; paid = settled).
 * @param rateByUserID Map(userID → credited rate) resolved from the published ladder.
 */
export function buildLaborPipelineReport({
  workOrders = [],
  pendingQcLogs = [],
  candidates = [],
  batches = [],
  rateByUserID = new Map(),
  shopRate = 0,
  now = new Date(),
} = {}) {
  const rateFor = (userID) => (userID ? Number(rateByUserID.get(userID)) || 0 : 0);
  const weekStart = getPayrollWeekStart(now);
  const weekEnd = getWeekEndFromStart(weekStart);

  // A piece work order in QC has already written its labor log; its forecast would double count.
  const committedWorkOrderIDs = new Set(pendingQcLogs.map((l) => l.workOrderID).filter(Boolean));

  const stages = {
    [PIPELINE_STAGE.UNCLAIMED]: emptyBucket(),
    [PIPELINE_STAGE.IN_PROGRESS]: emptyBucket(),
    [PIPELINE_STAGE.BLOCKED]: emptyBucket(),
    [PIPELINE_STAGE.QC]: emptyBucket(),
  };
  const byPerson = new Map();
  const byDiscipline = new Map();
  const rows = [];

  for (const wo of workOrders) {
    const stage = pipelineStage(wo);
    if (!stage) continue;
    if (committedWorkOrderIDs.has(wo.workOrderID)) continue;

    const labor = workOrderLabor(wo, { rateFor, shopRate });
    const dueDate = wo.promiseDate ? new Date(wo.promiseDate) : null;
    const row = {
      id: wo.workOrderID,
      workOrderID: wo.workOrderID,
      stage,
      stageLabel: STAGE_LABEL[stage],
      title: wo.title || `${wo.sourceType || 'work'} ${wo.sourceID || ''}`.trim(),
      sourceType: wo.sourceType || '',
      sourceID: wo.sourceID || '',
      discipline: wo.discipline || 'bench_jewelry',
      assignedToUserID: wo.assignedToUserID || '',
      assignedJeweler: wo.assignedJeweler || '',
      hours: labor.hours,
      value: labor.value,
      estimated: labor.estimated,
      isRush: !!wo.isRush,
      promiseDate: wo.promiseDate || null,
      dueThisWeek: !!(dueDate && !Number.isNaN(dueDate.getTime()) && dueDate <= weekEnd),
    };
    rows.push(row);
    addToBucket(stages[stage], row);

    const disciplineBucket = byDiscipline.get(row.discipline) || { discipline: row.discipline, ...emptyBucket() };
    byDiscipline.set(row.discipline, addToBucket(disciplineBucket, row));

    // Unclaimed work belongs to nobody — rolling it into a person's load would invent a commitment.
    if (row.assignedToUserID) {
      const person = byPerson.get(row.assignedToUserID) || {
        id: row.assignedToUserID,
        userID: row.assignedToUserID,
        userName: row.assignedJeweler || row.assignedToUserID,
        rate: rateFor(row.assignedToUserID),
        openCount: 0,
        openHours: 0,
        openValue: 0,
        qcValue: 0,
        owedNow: 0,
      };
      person.userName = person.userName || row.assignedJeweler;
      person.openCount += 1;
      person.openHours = round2h(person.openHours + row.hours);
      person.openValue = round2(person.openValue + row.value);
      if (stage === PIPELINE_STAGE.QC) person.qcValue = round2(person.qcValue + row.value);
      byPerson.set(row.assignedToUserID, person);
    }
  }

  // ---- Committed: credited but unpaid -------------------------------------------------------
  const heldInQc = round2(pendingQcLogs.reduce((s, l) => s + (Number(l.creditedValue) || 0), 0));
  const heldHours = round2h(pendingQcLogs.reduce((s, l) => s + (Number(l.creditedLaborHours) || 0), 0));

  const unbatched = round2(candidates.reduce((s, c) => s + laborPay(c), 0));
  const finalizedUnpaid = batches.filter((b) => b.status === PAYROLL_BATCH_STATUS.FINALIZED);
  const finalizedTotal = round2(finalizedUnpaid.reduce((s, b) => s + laborPay(b), 0));
  const owedNow = round2(unbatched + finalizedTotal);

  const paidThisWeek = round2(batches
    .filter((b) => b.status === PAYROLL_BATCH_STATUS.PAID && b.paidAt && new Date(b.paidAt) >= weekStart)
    .reduce((s, b) => s + laborPay(b), 0));

  for (const candidate of candidates) {
    const person = byPerson.get(candidate.userID) || {
      id: candidate.userID,
      userID: candidate.userID,
      userName: candidate.userName || candidate.userID,
      rate: rateFor(candidate.userID),
      openCount: 0,
      openHours: 0,
      openValue: 0,
      qcValue: 0,
      owedNow: 0,
    };
    person.owedNow = round2(person.owedNow + laborPay(candidate));
    byPerson.set(candidate.userID, person);
  }
  for (const batch of finalizedUnpaid) {
    const person = byPerson.get(batch.userID);
    if (person) person.owedNow = round2(person.owedNow + laborPay(batch));
  }

  const openValue = round2(Object.values(stages).reduce((s, b) => s + b.value, 0));
  const openHours = round2h(Object.values(stages).reduce((s, b) => s + b.hours, 0));

  return {
    summary: {
      // Forecast
      unclaimedCount: stages[PIPELINE_STAGE.UNCLAIMED].count,
      unclaimedHours: stages[PIPELINE_STAGE.UNCLAIMED].hours,
      unclaimedValue: stages[PIPELINE_STAGE.UNCLAIMED].value,
      claimedCount: stages[PIPELINE_STAGE.IN_PROGRESS].count,
      claimedHours: stages[PIPELINE_STAGE.IN_PROGRESS].hours,
      claimedValue: stages[PIPELINE_STAGE.IN_PROGRESS].value,
      blockedCount: stages[PIPELINE_STAGE.BLOCKED].count,
      blockedValue: stages[PIPELINE_STAGE.BLOCKED].value,
      qcCount: stages[PIPELINE_STAGE.QC].count,
      qcValue: stages[PIPELINE_STAGE.QC].value,
      openCount: rows.length,
      openHours,
      openValue,
      rushCount: rows.filter((r) => r.isRush).length,
      dueThisWeekCount: rows.filter((r) => r.dueThisWeek).length,
      dueThisWeekValue: round2(rows.filter((r) => r.dueThisWeek).reduce((s, r) => s + r.value, 0)),
      // Committed
      heldInQc,
      heldHours,
      heldCount: pendingQcLogs.length,
      unbatchedPayable: unbatched,
      finalizedUnpaid: finalizedTotal,
      owedNow,
      paidThisWeek,
      // The whole obligation: what is owed today plus everything still on the floor.
      totalCommitted: round2(owedNow + heldInQc + openValue),
      weekStart,
      weekEnd,
    },
    byStage: Object.entries(stages).map(([stage, bucket]) => ({
      id: stage, stage, stageLabel: STAGE_LABEL[stage], ...bucket,
    })),
    byPerson: [...byPerson.values()].sort((a, b) => (b.openValue + b.owedNow) - (a.openValue + a.owedNow)),
    byDiscipline: [...byDiscipline.values()].sort((a, b) => b.value - a.value),
    rows: rows.sort((a, b) => {
      if (a.isRush !== b.isRush) return a.isRush ? -1 : 1;
      if (a.promiseDate && b.promiseDate) return new Date(a.promiseDate) - new Date(b.promiseDate);
      if (a.promiseDate) return -1;
      if (b.promiseDate) return 1;
      return b.value - a.value;
    }),
  };
}
