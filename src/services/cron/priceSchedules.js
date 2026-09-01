/**
 * Owner-controlled schedules for the pricing crons (owner: "I want all
 * schedules in settings").
 *
 * Vercel cron times are baked into vercel.json at deploy time, so the actual
 * schedule cannot live there. Instead each pricing job fires HOURLY and this
 * gate decides whether it is due, from a settings document the admin edits.
 *
 * Catch-up semantics: a job is due when now has passed the most recent target
 * time and the last run predates that target. A missed window (deploy outage,
 * paused Vercel) runs on the next hourly tick instead of silently skipping to
 * the next period.
 *
 * Last-run stamps live in their own `cronRuns` collection, NOT on the settings
 * doc — settings are saved by a form that replaces subdocuments wholesale, and
 * a stamp stored there would be erased by every unrelated settings save.
 */
import { db } from '@/lib/database';

export const SCHEDULES_DOC_ID = 'pricing_schedules';
export const FREQUENCIES = ['hourly', 'daily', 'weekly', 'monthly', 'paused'];

/** Job registry: defaults mirror the schedules that were hardcoded in vercel.json. */
export const PRICE_JOBS = {
  metalPrices: {
    label: 'Metal prices',
    description: 'Pull live gold/silver/platinum/palladium rates from the market API.',
    default: { frequency: 'daily', hourUtc: 9, dayOfWeek: 1 },
  },
  materialPrices: {
    label: 'Material prices (Stuller)',
    description: 'Refresh wholesale costs for sizing stock, solder, and wire — the inputs to metal-dependent task prices.',
    default: { frequency: 'daily', hourUtc: 9, dayOfWeek: 1 },
  },
  stonePrices: {
    label: 'Stone prices (Stuller)',
    description: 'Refresh wholesale costs for the stone-SKU catalog used in design pricing.',
    default: { frequency: 'weekly', hourUtc: 10, dayOfWeek: 1 },
  },
  listingReprice: {
    label: 'Shop listing reprice',
    description: "Reprice every sellable listing from the day's metal snapshot; made pieces from their fixed COGS.",
    default: { frequency: 'daily', hourUtc: 10, dayOfWeek: 1 },
  },
};

const clampInt = (v, lo, hi, dflt) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= lo && n <= hi ? n : dflt;
};

/** Normalize one job's schedule against its defaults. */
export function normalizeSchedule(raw, jobKey) {
  const dflt = PRICE_JOBS[jobKey]?.default || { frequency: 'daily', hourUtc: 9, dayOfWeek: 1 };
  const frequency = FREQUENCIES.includes(raw?.frequency) ? raw.frequency : dflt.frequency;
  return {
    frequency,
    hourUtc: clampInt(raw?.hourUtc, 0, 23, dflt.hourUtc),
    dayOfWeek: clampInt(raw?.dayOfWeek, 0, 6, dflt.dayOfWeek),
  };
}

/** All schedules, defaults filled in. */
export async function getSchedules() {
  const dbi = await db.connect();
  const doc = await dbi.collection('adminSettings').findOne({ _id: SCHEDULES_DOC_ID });
  const out = {};
  for (const key of Object.keys(PRICE_JOBS)) {
    out[key] = normalizeSchedule(doc?.jobs?.[key], key);
  }
  return out;
}

/**
 * The most recent moment this schedule wanted to run, at or before `now`.
 * Null for hourly (handled by spacing) and paused.
 */
export function mostRecentTarget(schedule, now) {
  const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), schedule.hourUtc, 0, 0));
  if (schedule.frequency === 'daily') {
    if (t > now) t.setUTCDate(t.getUTCDate() - 1);
    return t;
  }
  if (schedule.frequency === 'weekly') {
    const back = (now.getUTCDay() - schedule.dayOfWeek + 7) % 7;
    t.setUTCDate(t.getUTCDate() - back);
    if (t > now) t.setUTCDate(t.getUTCDate() - 7);
    return t;
  }
  if (schedule.frequency === 'monthly') {
    const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, schedule.hourUtc, 0, 0));
    if (first > now) first.setUTCMonth(first.getUTCMonth() - 1);
    return first;
  }
  return null;
}

/** Is the job due right now, given when it last ran? */
export function isScheduleDue(schedule, lastRunAt, now = new Date()) {
  if (schedule.frequency === 'paused') return false;
  if (schedule.frequency === 'hourly') {
    // 55-minute spacing tolerates cron jitter without double-running an hour.
    return !lastRunAt || (now - new Date(lastRunAt)) >= 55 * 60 * 1000;
  }
  const target = mostRecentTarget(schedule, now);
  if (!target || now < target) return false;
  return !lastRunAt || new Date(lastRunAt) < target;
}

/** Gate used by the cron routes: due? plus the schedule for reporting. */
export async function priceJobDue(jobKey, now = new Date()) {
  const schedules = await getSchedules();
  const schedule = schedules[jobKey];
  const dbi = await db.connect();
  const run = await dbi.collection('cronRuns').findOne({ _id: jobKey });
  const due = isScheduleDue(schedule, run?.lastRunAt, now);
  return { due, schedule, lastRunAt: run?.lastRunAt || null };
}

/** Stamp a completed run. Failures are stamped too, with their status, so a
 *  crashing job doesn't retry every hour forever unnoticed — it shows in the
 *  settings panel as its last result instead. */
export async function markPriceJobRun(jobKey, { status = 'ok', detail = '' } = {}) {
  const dbi = await db.connect();
  await dbi.collection('cronRuns').updateOne(
    { _id: jobKey },
    { $set: { lastRunAt: new Date(), lastStatus: status, lastDetail: String(detail).slice(0, 500) } },
    { upsert: true },
  );
}

/** Last-run info for the settings panel. */
export async function getPriceJobRuns() {
  const dbi = await db.connect();
  const rows = await dbi.collection('cronRuns')
    .find({ _id: { $in: Object.keys(PRICE_JOBS) } })
    .toArray();
  return Object.fromEntries(rows.map((r) => [r._id, { lastRunAt: r.lastRunAt, lastStatus: r.lastStatus, lastDetail: r.lastDetail }]));
}
