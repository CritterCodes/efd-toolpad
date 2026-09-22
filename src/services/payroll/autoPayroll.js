/**
 * Weekly payroll run (owner, 2026-09-21: "payroll is a chore and I miss it most weeks").
 *
 * Payroll here is a LEDGER, not a payment: labor logs are written at QC pass, and a batch groups
 * one jeweler's week. Until now an admin had to open the payroll page every Monday, press
 * Create Batch per jeweler, then Mark Paid. This runs that ceremony on a schedule:
 *
 *   - every closed week (Sunday..Saturday before the current week) with unbatched labor or sale
 *     payouts gets its batch created and finalized — including weeks that were missed. The run is
 *     Wednesday 6am Central: transfers land in payees' banks Friday (owner, 2026-09-22);
 *   - every finalized batch whose payee has a live Stripe Connect account is PAID by transfer
 *     (services/payroll/connectPayouts.js) — the owner's own labor included; the owner is a payee
 *     like anyone else (owner, 2026-09-22: Stripe is the only path — no ledger settlement, no
 *     manual Mark Paid);
 *   - anything left finalized is waiting on the payee's Stripe setup; they are nudged, admins see it.
 *
 * Idempotent: an open batch for a jeweler-week is skipped, and batched logs are no longer
 * candidates, so re-running on the same Monday is a no-op.
 */
import {
  listPayrollCandidates,
  createPayrollBatch,
  finalizePayrollBatch,
} from '@/app/api/repairs/payroll/service';
import { getMondayOfWeek, payrollTotal } from '@/services/payrollUtils';
import { notifyAllAdmins } from '@/lib/notificationService';
import { adminBase } from '@/lib/appUrls';
import { runConnectPayouts, nudgeUnpaidPayees } from '@/services/payroll/connectPayouts';
import { listDailyPayees } from '@/services/payroll/payoutCadence';

export const PAYROLL_CRON_ACTOR = 'payroll-cron';

const DAY = 24 * 60 * 60 * 1000;
const money = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

/** The most recent Sunday whose week (Sun–Sat) is fully closed as of `now`. */
export function lastClosedWeekStart(now = new Date()) {
  const thisWeekStart = getMondayOfWeek(now); // Sunday — see payrollUtils.getPayrollWeekStart
  return new Date(thisWeekStart.getTime() - 7 * DAY);
}

export async function runWeeklyPayroll({ now = new Date(), createdBy = PAYROLL_CRON_ACTOR, notify = true } = {}) {
  const weekEnd = lastClosedWeekStart(now);
  const all = await listPayrollCandidates({ weekEnd });
  // Daily-cadence payees are batched day by day by the payout cron; the weekly run leaves them alone.
  const dailyIDs = new Set((await listDailyPayees()).map((u) => u.userID));
  const candidates = all.filter((c) => !dailyIDs.has(c.userID));

  const result = { weekEnd, finalized: [], toPay: [], skipped: [], errors: [], payouts: null, nudged: [] };

  for (const candidate of candidates) {
    const label = { userID: candidate.userID, userName: candidate.userName, weekStart: candidate.weekStart };
    try {
      const batch = await createPayrollBatch({
        weekStart: candidate.weekStart,
        userID: candidate.userID,
        createdBy,
        notes: 'Auto-created by the weekly payroll run.',
      });
      await finalizePayrollBatch(batch.batchID);
      const amount = payrollTotal(batch);
      result.finalized.push({ ...label, batchID: batch.batchID, amount, hours: Number(batch.laborHours || 0) });
    } catch (error) {
      if (/already exists/i.test(error?.message || '')) {
        result.skipped.push({ ...label, reason: 'open batch exists' });
      } else {
        result.errors.push({ ...label, error: error?.message || String(error) });
      }
    }
  }

  // Money: every finalized batch (this week's and any older ones) whose payee has a live Stripe
  // account, the owner included. Whatever is still finalized afterwards is waiting on Stripe setup.
  try {
    result.payouts = await runConnectPayouts({ actor: createdBy, notify: false });
    result.toPay = (result.payouts.skipped || []).filter((b) => /no Stripe account|onboarding not finished|insufficient/.test(b.reason || ''));
    result.nudged = await nudgeUnpaidPayees();
  } catch (error) {
    result.errors.push({ error: `Stripe payouts: ${error?.message || error}` });
  }

  if (notify) await notifyPayrollRun(result);
  return result;
}

/** Tell admins what happened — loud only when someone is actually owed. Best-effort. */
export async function notifyPayrollRun(result) {
  const payrollUrl = `${adminBase()}/dashboard/repairs/payroll`;
  try {
    const paid = result.payouts?.paid || [];
    const shortfall = result.payouts?.shortfall || [];
    const waiting = result.toPay.filter((b) => !/insufficient/.test(b.reason || ''));
    const parts = [];
    if (paid.length) parts.push(`Paid by Stripe: ${paid.map((p) => `${p.userName || p.userID} ${money(p.amount)}`).join(', ')}.`);
    if (waiting.length) parts.push(`Waiting on Stripe setup: ${[...new Set(waiting.map((b) => b.userName || b.userID))].join(', ')} (${money(waiting.reduce((s, b) => s + (b.amount || 0), 0))}) — they were nudged to connect.`);
    if (shortfall.length) parts.push(`EFD's Stripe balance was short for ${shortfall.map((b) => money(b.amount)).join(', ')} — retried daily.`);
    if (result.errors.length) parts.push(`${result.errors.length} batch${result.errors.length === 1 ? '' : 'es'} failed — see payroll.`);
    if (!parts.length) return; // nothing happened, say nothing

    const needsHand = shortfall.length > 0 || result.errors.length > 0;
    await notifyAllAdmins({
      type: needsHand ? 'payroll-ready' : 'payroll-ran',
      title: needsHand
        ? 'Payroll ran — something needs a look'
        : paid.length
          ? `Payroll ran — ${money(paid.reduce((s, p) => s + p.amount, 0))} paid by Stripe`
          : 'Payroll ran — waiting on Stripe setup',
      message: parts.join(' '),
      actionUrl: payrollUrl,
      actionLabel: 'Open payroll',
      priority: needsHand ? 'high' : 'low',
      channels: needsHand ? ['inApp', 'email', 'push'] : ['inApp'],
      relatedType: 'payroll-run',
      relatedData: { finalized: result.finalized, payouts: result.payouts, nudged: result.nudged, errors: result.errors },
    });
  } catch (error) {
    console.error('payroll run notification failed (non-fatal):', error?.message);
  }
}
