import { NextResponse } from "next/server";
import { db } from "@/lib/database";
import { requireRepairsAccess } from "@/lib/apiAuth";
import { REPAIR_STATUS } from "@/services/repairWorkflow";
import {
  DEFAULT_DAILY_CAPACITY_HOURS,
  DEFAULT_DELIVERY_DAYS,
  DEFAULT_TURNAROUND_MAX_DAYS,
  DEFAULT_TURNAROUND_WINDOW_DAYS,
  LABOR_RATES,
} from "@/services/promiseDate.service";

// Work physically in the shop and not yet finished — the queue a new intake
// joins. Mirrors efd-mcp shopWorkload(): excludes leads, READY FOR PICKUP and
// PAID_CLOSED. Kept in sync with the read-only MCP definition.
const OPEN_STATUSES = [REPAIR_STATUS.READY_FOR_WORK, REPAIR_STATUS.IN_PROGRESS];

const ADMIN_SETTINGS_ID = "repair_task_admin_settings";

// Light in-memory cache: this is shop-wide context, not per-request, and the
// numbers barely move within a session of intaking repairs.
const CACHE_TTL_MS = 60 * 1000;
let cache = { at: 0, data: null };

function resolveCapacityHours(business = {}) {
  if (Number(business.dailyLaborCapacityHours) > 0) {
    return Number(business.dailyLaborCapacityHours);
  }
  // Derive from staffing counts + per-role rates when capacity isn't set directly.
  const staffing = business.benchStaffing;
  const rates = { ...LABOR_RATES, ...(business.laborRates || {}) };
  if (staffing && typeof staffing === "object") {
    const jewelers = Number(staffing.jewelers) || 0;
    const owners = Number(staffing.owner ?? staffing.owners) || 0;
    const apprentices = Number(staffing.apprentices) || 0;
    const derived = jewelers * rates.jeweler + owners * rates.owner + apprentices * rates.apprentice;
    if (derived > 0) return derived;
  }
  return DEFAULT_DAILY_CAPACITY_HOURS;
}

function resolveTurnaroundWindowDays(business = {}) {
  const n = Number(business.turnaroundWindowDays);
  return n > 0 ? n : DEFAULT_TURNAROUND_WINDOW_DAYS;
}

function resolveTurnaroundMaxDays(business = {}) {
  const n = Number(business.turnaroundMaxDays);
  return n > 0 ? n : DEFAULT_TURNAROUND_MAX_DAYS;
}

function resolveDeliveryDays(business = {}) {
  const dd = business.deliveryDays;
  if (Array.isArray(dd) && dd.length && dd.every((n) => Number.isInteger(n) && n >= 0 && n <= 6)) {
    return dd;
  }
  return DEFAULT_DELIVERY_DAYS;
}

async function computeContext(dbInstance) {
  const repairs = dbInstance.collection("repairs");

  // Settings drive the turnaround window/cap, so read them before building that
  // aggregation. Fast indexed _id lookup; the 60s cache covers the round trip.
  const settings = await dbInstance
    .collection("adminSettings")
    .findOne({ _id: ADMIN_SETTINGS_ID });
  const business = settings?.business || {};
  const turnaroundWindowDays = resolveTurnaroundWindowDays(business);
  const turnaroundMaxDays = resolveTurnaroundMaxDays(business);
  const windowStart = new Date(Date.now() - turnaroundWindowDays * 24 * 60 * 60 * 1000);

  // (b)+(c): queued labor-hours behind open jobs. laborHours per embedded task
  // (falling back to pricing.totalLaborHours) is PER UNIT, so multiply by the
  // task quantity ("set 4 stones" = 4×). Empty tasks[] contribute 0.
  const taskHoursExpr = {
    $sum: {
      $map: {
        input: { $ifNull: ["$tasks", []] },
        as: "t",
        in: {
          $multiply: [
            { $ifNull: ["$$t.laborHours", { $ifNull: ["$$t.pricing.totalLaborHours", 0] }] },
            { $cond: [{ $gt: ["$$t.quantity", 0] }, "$$t.quantity", 1] },
          ],
        },
      },
    },
  };

  const workloadPromise = repairs
    .aggregate([
      { $match: { status: { $in: OPEN_STATUSES } } },
      { $addFields: { _taskHours: taskHoursExpr, _taskCount: { $size: { $ifNull: ["$tasks", []] } } } },
      {
        $group: {
          _id: null,
          openJobs: { $sum: 1 },
          queuedLaborHours: { $sum: "$_taskHours" },
          jobsWithUnknownHours: { $sum: { $cond: [{ $eq: ["$_taskCount", 0] }, 1, 0] } },
        },
      },
    ])
    .toArray();

  // (a): recent average turnaround (createdAt -> completedAt), coercing legacy
  // string dates so a single bad record can't crash the aggregation. Restricted
  // to jobs completed within the trailing window, and jobs whose turnaround
  // exceeds the cap (stalled/abandoned-then-closed) are excluded as outliers.
  const turnaroundPromise = repairs
    .aggregate([
      { $match: { completedAt: { $ne: null }, createdAt: { $ne: null } } },
      {
        $addFields: {
          _completedAt: { $convert: { input: "$completedAt", to: "date", onError: null, onNull: null } },
          _createdAt: { $convert: { input: "$createdAt", to: "date", onError: null, onNull: null } },
        },
      },
      { $match: { _completedAt: { $gte: windowStart }, _createdAt: { $ne: null } } },
      { $project: { days: { $divide: [{ $subtract: ["$_completedAt", "$_createdAt"] }, 1000 * 60 * 60 * 24] } } },
      { $match: { days: { $gte: 0, $lte: turnaroundMaxDays } } },
      { $group: { _id: null, avgTurnaroundDays: { $avg: "$days" }, sampled: { $sum: 1 } } },
    ])
    .toArray();

  const [workloadRows, turnaroundRows] = await Promise.all([
    workloadPromise,
    turnaroundPromise,
  ]);

  const w = workloadRows[0] || { openJobs: 0, queuedLaborHours: 0, jobsWithUnknownHours: 0 };
  const t = turnaroundRows[0] || { avgTurnaroundDays: null, sampled: 0 };

  return {
    avgTurnaroundDays: t.avgTurnaroundDays != null ? +t.avgTurnaroundDays.toFixed(1) : null,
    turnaroundSampleSize: t.sampled,
    turnaroundWindowDays,
    turnaroundMaxDays,
    openWorkloadHours: +(+(w.queuedLaborHours || 0)).toFixed(1),
    openJobCount: w.openJobs,
    jobsWithUnknownHours: w.jobsWithUnknownHours,
    dailyCapacityHours: resolveCapacityHours(business),
    deliveryDays: resolveDeliveryDays(business),
  };
}

export const GET = async () => {
  try {
    const { errorResponse } = await requireRepairsAccess();
    if (errorResponse) return errorResponse;

    if (cache.data && Date.now() - cache.at < CACHE_TTL_MS) {
      return NextResponse.json(cache.data);
    }

    const dbInstance = await db.connect();
    const data = await computeContext(dbInstance);
    cache = { at: Date.now(), data };

    return NextResponse.json(data);
  } catch (error) {
    console.error("GET /api/repairs/estimate-context error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
