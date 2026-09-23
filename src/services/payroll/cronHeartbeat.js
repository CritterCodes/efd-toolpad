/**
 * Payroll cron heartbeat (owner, 2026-09-23: "add the heartbeat so I can see it on the payroll page").
 *
 * THE PROBLEM THIS SOLVES. A payroll run that pays nobody writes nothing: no batch, no transfer, and
 * `notifyPayrollRun` deliberately stays silent when there is nothing to say. So a healthy Wednesday
 * with no work to pay and a Wednesday where the cron never fired look IDENTICAL from inside the app.
 * That is not hypothetical — the Monday schedule never fired once and nobody noticed for weeks; the
 * only way to answer "did payroll run?" was to read Vercel's logs by hand.
 *
 * So every payroll cron now stamps that it ran, whatever it did. One document per job holds the last
 * run plus a short history, and the payroll page reads it. "Nothing to pay" becomes a visible outcome
 * instead of an absence.
 *
 * Recording must never change what a run does: `recordCronRun` swallows its own errors, because a
 * heartbeat that failed to write is a worse reason to fail payroll than no heartbeat at all.
 */
import { db } from '@/lib/database';

/**
 * `cronRuns` already existed as the price jobs' clock (services/cron/priceSchedules.js) and is keyed by
 * `_id: jobKey` with `lastRunAt` / `lastStatus` / `lastDetail`. We use the SAME collection and the SAME
 * key and field names rather than inventing a second shape beside it — one convention for "when did
 * this job last run", whoever asks. Both readers filter to their own job list, so neither sees the
 * other's rows. The payroll jobs add `history` on top; the price jobs simply do not have it.
 */
export const COLLECTION = 'cronRuns';
const HISTORY = 20;

/** The payroll jobs the page reports on, with the cadence each is expected to keep (vercel.json). */
export const PAYROLL_JOBS = Object.freeze({
  'weekly-payroll': { label: 'Weekly payroll', cadence: 'weekly', weekday: 3, hourUtc: 11, graceHours: 26 },
  'payroll-payouts': { label: 'Daily payout sweep', cadence: 'daily', hourUtc: 12, graceHours: 26 },
  'payroll-funding': { label: 'Funding check', cadence: 'daily', hourUtc: 15, graceHours: 26 },
  'payroll-sweep': { label: 'Floor sweep', cadence: 'weekly', weekday: 4, hourUtc: 16, graceHours: 26 },
});

const money = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

/**
 * Pure: one plain sentence for what a weekly run did. This is the line the owner reads on a Wednesday,
 * so "nothing to pay" has to be a real answer and not a shrug.
 */
export function summarizeWeeklyRun(result = {}) {
  const paid = result?.payouts?.paid || [];
  const shortfall = result?.payouts?.shortfall || [];
  const finalized = result?.finalized || [];
  const errors = result?.errors || [];
  const parts = [];
  if (paid.length) parts.push(`paid ${paid.length} batch${paid.length === 1 ? '' : 'es'}, ${money(paid.reduce((s, p) => s + (Number(p.amount) || 0), 0))}`);
  else if (finalized.length) parts.push(`finalized ${finalized.length} batch${finalized.length === 1 ? '' : 'es'}`);
  if (shortfall.length) parts.push(`${money(result?.payouts?.shortfallTotal || 0)} could not be sent — Stripe balance short`);
  if (errors.length) parts.push(`${errors.length} error${errors.length === 1 ? '' : 's'}`);
  return parts.length ? parts.join(' · ') : 'Nothing to pay — no closed week had unpaid work';
}

/** Pure: a sentence for the other payroll jobs, which mostly report a skip. */
export function summarizeJobRun(job, result = {}) {
  if (result?.error) return `Failed: ${result.error}`;
  if (job === 'weekly-payroll') return summarizeWeeklyRun(result);
  if (job === 'payroll-payouts') {
    const paid = result?.paid || [];
    if (paid.length) return `Paid ${paid.length}, ${money(paid.reduce((s, p) => s + (Number(p.amount) || 0), 0))}`;
    if ((result?.shortfall || []).length) return `Balance short for ${result.shortfall.length} batch${result.shortfall.length === 1 ? '' : 'es'}`;
    return 'Nothing due today';
  }
  if (job === 'payroll-funding') return result?.topup ? `Pulled ${money(result.topup.amount)} into Stripe` : (result?.skipped || 'Nothing to fund');
  if (job === 'payroll-sweep') return result?.payout ? `Swept ${money(result.payout.amount)} to the bank` : (result?.skipped || 'Nothing to sweep');
  return result?.skipped || 'Ran';
}

/** Pure: when this job should next run, from a UTC clock. */
export function nextRunAt(job, now = new Date()) {
  const spec = PAYROLL_JOBS[job];
  if (!spec) return null;
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), spec.hourUtc, 0, 0, 0));
  if (spec.cadence === 'daily') {
    if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    return next;
  }
  // Weekly: advance to the job's weekday, and past today if today's slot has already gone.
  let days = (spec.weekday - next.getUTCDay() + 7) % 7;
  if (days === 0 && next <= now) days = 7;
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

/**
 * Pure: has this job missed its slot? `graceHours` past the expected time before we call it overdue,
 * so a slow scheduler or a deploy window does not cry wolf. No run ever recorded is overdue too —
 * that is exactly the state the Monday cron sat in.
 */
export function isOverdue(job, lastRanAt, now = new Date()) {
  const spec = PAYROLL_JOBS[job];
  if (!spec) return false;
  if (!lastRanAt) return true;
  const expectedEvery = spec.cadence === 'daily' ? 24 : 24 * 7;
  const hoursSince = (now.getTime() - new Date(lastRanAt).getTime()) / 36e5;
  return hoursSince > expectedEvery + spec.graceHours;
}

/**
 * Stamp that a job ran. Never throws — see the note at the top of this file.
 * @param {{ job: string, ok?: boolean, result?: object, error?: string, ranAt?: Date, durationMs?: number }} args
 */
export async function recordCronRun({ job, ok = true, result = {}, error = null, ranAt = new Date(), durationMs = null } = {}) {
  try {
    if (!job) return { recorded: false };
    const healthy = Boolean(ok) && !error;
    const detail = error ? `Failed: ${error}` : summarizeJobRun(job, result);
    const entry = { ranAt, ok: healthy, summary: detail, ...(error ? { error } : {}), ...(durationMs != null ? { durationMs } : {}) };
    const dbi = await db.connect();
    await dbi.collection(COLLECTION).updateOne(
      { _id: job },
      {
        // The price jobs' field names, so one reader shape serves every cron in here.
        $set: { lastRunAt: ranAt, lastStatus: healthy ? 'ok' : 'error', lastDetail: String(detail).slice(0, 500), ...(durationMs != null ? { lastDurationMs: durationMs } : {}) },
        // A short tail, so "has this been failing for weeks?" is answerable without a log query.
        $push: { history: { $each: [entry], $slice: -HISTORY } },
        $setOnInsert: { createdAt: ranAt },
      },
      { upsert: true },
    );
    return { recorded: true };
  } catch (e) {
    console.error(`[cron-heartbeat] could not record ${job}:`, e?.message || e);
    return { recorded: false };
  }
}

/** The last run of each payroll job, with overdue flags and the next expected slot. */
export async function readPayrollRuns({ now = new Date() } = {}) {
  let docs = [];
  try {
    const dbi = await db.connect();
    docs = await dbi.collection(COLLECTION).find({ _id: { $in: Object.keys(PAYROLL_JOBS) } }).toArray();
  } catch (e) {
    console.error('[cron-heartbeat] could not read runs:', e?.message || e);
  }
  const byJob = new Map(docs.map((d) => [d._id, d]));
  return Object.entries(PAYROLL_JOBS).map(([job, spec]) => {
    const doc = byJob.get(job) || null;
    const lastRanAt = doc?.lastRunAt || null;
    return {
      job,
      label: spec.label,
      cadence: spec.cadence,
      lastRanAt,
      ok: lastRanAt ? doc.lastStatus !== 'error' : null,
      summary: doc?.lastDetail || null,
      error: doc?.lastStatus === 'error' ? doc.lastDetail : null,
      nextRunAt: nextRunAt(job, now),
      overdue: isOverdue(job, lastRanAt, now),
      neverRun: !lastRanAt,
    };
  });
}

/**
 * Wrap a cron handler so it always leaves a heartbeat, success or failure, and rethrows so the route's
 * own error handling is unchanged.
 */
export async function withHeartbeat(job, run) {
  const startedAt = new Date();
  try {
    const result = await run();
    await recordCronRun({ job, ok: !result?.error, result, error: result?.error || null, ranAt: startedAt, durationMs: Date.now() - startedAt.getTime() });
    return result;
  } catch (error) {
    await recordCronRun({ job, ok: false, error: error?.message || String(error), ranAt: startedAt, durationMs: Date.now() - startedAt.getTime() });
    throw error;
  }
}
