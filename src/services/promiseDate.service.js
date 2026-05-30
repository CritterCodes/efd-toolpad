/**
 * Promise-date estimator (pure, no DB / no I/O).
 *
 * Working days are driven solely by load: (job hours + queued hours) divided by
 * the shop's daily labor capacity. The shop's recent average turnaround is NOT a
 * floor — it's used only as a fallback to size a job whose tasks carry no logged
 * hours (e.g. a custom), where the load signal is blind. Rush jobs skip all of
 * that and are promised the next day.
 *
 * Wholesale jobs are only dropped off / picked up on fixed delivery days
 * (default Tue/Thu): the work clock can't start until the job arrives on the
 * next delivery day, and the finished job can't be returned before the next
 * delivery day after it's done. Rush wholesale jobs bypass that schedule and
 * are returned the next day.
 *
 * All inputs are passed in (turnaround, workload, capacity, delivery days come
 * from the estimate-context API). `now` is injectable so the function is
 * deterministic and unit-testable.
 */

// Per-role daily labor capacity in hours. Encoded so shop capacity can be
// auto-derived once onsite roles become distinguishable in the data; until
// then capacity is configured directly (adminSettings.business.*).
export const LABOR_RATES = { jeweler: 6, owner: 3, apprentice: 1 };

// owner(3) + one jeweler(6) + one apprentice(1)
export const DEFAULT_DAILY_CAPACITY_HOURS = 10;

// getDay() values: 0=Sun ... 2=Tue, 4=Thu, 6=Sat
export const DEFAULT_DELIVERY_DAYS = [2, 4];

// Average turnaround (the floor) is computed over jobs COMPLETED within this
// trailing window, so the floor tracks current shop behavior, not all history.
export const DEFAULT_TURNAROUND_WINDOW_DAYS = 30;

// Jobs whose turnaround exceeds this are treated as stalled/abandoned-then-closed
// outliers and excluded from the average so one stale job can't inflate the floor.
export const DEFAULT_TURNAROUND_MAX_DAYS = 21;

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isWeekend(d) {
  const day = d.getDay();
  return day === 0 || day === 6;
}

/**
 * Format a Date as a `YYYY-MM-DD` string using local calendar parts (matches
 * what an <input type="date"> expects; avoids UTC off-by-one from toISOString).
 */
export function toDateInputValue(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Add N calendar days. */
export function addDays(date, n) {
  const d = startOfDay(date);
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Add N business days (skipping Sat/Sun). The start date is first advanced to a
 * business day if it lands on a weekend, then N weekdays are added.
 */
export function addBusinessDays(date, n) {
  const d = startOfDay(date);
  while (isWeekend(d)) d.setDate(d.getDate() + 1);
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    if (!isWeekend(d)) added += 1;
  }
  return d;
}

/**
 * Snap forward to the next delivery day on or after `date`.
 * @param {number[]} dows getDay() values that are delivery days.
 */
export function nextDeliveryDay(date, dows = DEFAULT_DELIVERY_DAYS) {
  const set = new Set(dows);
  const d = startOfDay(date);
  for (let i = 0; i < 14; i += 1) {
    if (set.has(d.getDay())) return d;
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function sumLaborHours(tasks = []) {
  return tasks.reduce((sum, t) => {
    const h = t?.pricing?.totalLaborHours ?? t?.laborHours ?? 0;
    // laborHours is per-unit; multiply by quantity ("set 4 stones" = 4×).
    const qty = Number(t?.quantity) > 0 ? Number(t.quantity) : 1;
    return sum + (Number(h) || 0) * qty;
  }, 0);
}

/**
 * @param {object}   args
 * @param {object[]} args.tasks              Selected catalog tasks (carry pricing.totalLaborHours / service.rushDays).
 * @param {boolean}  args.isRush             Rush job → jumps the queue, bypasses wholesale delivery schedule.
 * @param {boolean}  args.isWholesale        Wholesale → constrained to delivery days unless rush.
 * @param {number}   args.openWorkloadHours  Queued labor-hours behind this job (signal c).
 * @param {number?}  args.avgTurnaroundDays  Recent average turnaround in days (signal a, the floor).
 * @param {number}   args.dailyCapacityHours Shop labor-hours available per day.
 * @param {number[]} args.deliveryDays       getDay() values for wholesale delivery.
 * @param {Date}     args.now                Injected "today".
 * @returns {{ suggestedDate: Date, suggestedDateString: string, baseDays: number, breakdown: object }}
 */
export function estimatePromiseDate({
  tasks = [],
  isRush = false,
  isWholesale = false,
  openWorkloadHours = 0,
  avgTurnaroundDays = null,
  dailyCapacityHours = DEFAULT_DAILY_CAPACITY_HOURS,
  deliveryDays = DEFAULT_DELIVERY_DAYS,
  now = new Date(),
} = {}) {
  const capacity = dailyCapacityHours > 0 ? dailyCapacityHours : DEFAULT_DAILY_CAPACITY_HOURS;
  const jobHours = sumLaborHours(tasks);
  const queueHours = Math.max(0, Number(openWorkloadHours) || 0);
  const avgTurnaround = avgTurnaroundDays != null ? Math.round(avgTurnaroundDays) : 0;

  const today = startOfDay(now);
  let workStart = today;
  let suggestedDate;
  let deliveryAdjusted = false;
  let baseDays;
  let usedTurnaroundFallback = false;

  if (isRush) {
    // Rush skips the queue and the wholesale delivery schedule entirely:
    // the job is promised the next day.
    baseDays = 1;
    suggestedDate = addDays(today, 1);
  } else {
    // Load is the sole driver: working days = (queue + this job) / capacity.
    // Avg turnaround is NOT a floor — it's only a fallback for a job whose
    // tasks carry no logged hours, where load can't size it (e.g. a custom).
    const loadDays = Math.ceil((queueHours + jobHours) / capacity);
    if (jobHours <= 0 && avgTurnaround > 0) {
      baseDays = Math.max(avgTurnaround, loadDays, 1);
      usedTurnaroundFallback = true;
    } else {
      baseDays = Math.max(loadDays, 1);
    }

    if (isWholesale) {
      workStart = nextDeliveryDay(today, deliveryDays);
      const workDone = addBusinessDays(workStart, baseDays);
      suggestedDate = nextDeliveryDay(workDone, deliveryDays);
      deliveryAdjusted = true;
    } else {
      suggestedDate = addBusinessDays(today, baseDays);
    }
  }

  return {
    suggestedDate,
    suggestedDateString: toDateInputValue(suggestedDate),
    baseDays,
    breakdown: {
      jobHours: +jobHours.toFixed(2),
      queueHours: +queueHours.toFixed(2),
      dailyCapacityHours: capacity,
      avgTurnaroundDays: avgTurnaroundDays != null ? +Number(avgTurnaroundDays).toFixed(1) : null,
      usedTurnaroundFallback,
      baseDays,
      isRush,
      isWholesale,
      deliveryAdjusted,
      workStart: toDateInputValue(workStart),
    },
  };
}
