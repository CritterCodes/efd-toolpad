/**
 * Weekly payroll run (owner, 2026-09-21: "payroll is a chore and I miss it most weeks").
 *
 * Payroll here is a LEDGER, not a payment: labor logs are written at QC pass, and a batch groups
 * one jeweler's week. Until now an admin had to open the payroll page every Monday, press
 * Create Batch per jeweler, then Mark Paid. This runs that ceremony on a schedule:
 *
 *   - every closed week (Monday..Sunday before the current Monday) with unbatched labor or sale
 *     payouts gets its batch created and finalized — including weeks that were missed;
 *   - an OWNER-OPERATOR's batch is settled immediately as `owner-draw-ledger`: the owner's labor
 *     is earnings bookkeeping, not a payout (there is no one to pay), so it never sits "owed";
 *   - anyone else's batch is left FINALIZED and admins are told there is money to pay.
 *
 * Money never moves here. When Stripe Connect payouts land (the labor-log `payeeUserID` field is
 * already in place for it), the "toPay" list is where a transfer would be initiated.
 *
 * Idempotent: an open batch for a jeweler-week is skipped, and batched logs are no longer
 * candidates, so re-running on the same Monday is a no-op.
 */
import {
  listPayrollCandidates,
  createPayrollBatch,
  finalizePayrollBatch,
  markPayrollBatchPaid,
  getOwnerOperatorUserIDs,
} from '@/app/api/repairs/payroll/service';
import { getMondayOfWeek } from '@/services/payrollUtils';
import { notifyAllAdmins } from '@/lib/notificationService';
import { adminBase } from '@/lib/appUrls';
import { isAutoPayReady, runConnectPayouts } from '@/services/payroll/connectPayouts';

export const OWNER_LEDGER_METHOD = 'owner-draw-ledger';
export const PAYROLL_CRON_ACTOR = 'payroll-cron';

const DAY = 24 * 60 * 60 * 1000;
const money = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

/** The most recent Monday whose week is fully closed as of `now` (weeks are keyed by Monday). */
export function lastClosedWeekStart(now = new Date()) {
  const thisMonday = getMondayOfWeek(now);
  return new Date(thisMonday.getTime() - 7 * DAY);
}

export async function runWeeklyPayroll({ now = new Date(), createdBy = PAYROLL_CRON_ACTOR, notify = true } = {}) {
  const weekEnd = lastClosedWeekStart(now);
  const [candidates, ownerIDs] = await Promise.all([
    listPayrollCandidates({ weekEnd }),
    getOwnerOperatorUserIDs(),
  ]);
  const owners = new Set(ownerIDs);

  const result = { weekEnd, ownerLedger: [], toPay: [], skipped: [], errors: [], payouts: null };

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
      const amount = Number(batch.laborPay || 0) + Number(batch.salePay || 0);

      // An owner-operator who is connected to Stripe with auto-pay on gets a real transfer below,
      // like any other payee; otherwise their labor settles to the ledger (nobody to pay).
      if (owners.has(candidate.userID) && !(await isAutoPayReady(candidate.userID))) {
        await markPayrollBatchPaid(batch.batchID, {
          paidAt: now,
          paymentMethod: OWNER_LEDGER_METHOD,
          paymentReference: 'auto',
          notes: 'Owner-operator labor — ledger only, no payout.',
          notify: false,
        });
        result.ownerLedger.push({ ...label, batchID: batch.batchID, amount, hours: Number(batch.laborHours || 0) });
      } else {
        result.toPay.push({ ...label, batchID: batch.batchID, amount, hours: Number(batch.laborHours || 0) });
      }
    } catch (error) {
      if (/already exists/i.test(error?.message || '')) {
        result.skipped.push({ ...label, reason: 'open batch exists' });
      } else {
        result.errors.push({ ...label, error: error?.message || String(error) });
      }
    }
  }

  // Money: every finalized batch whose payee is connected + on auto-pay (owner included).
  try {
    result.payouts = await runConnectPayouts({ actor: createdBy, notify: false });
    const paidIDs = new Set((result.payouts.paid || []).map((p) => p.batchID));
    result.toPay = result.toPay.filter((b) => !paidIDs.has(b.batchID));
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
    const paidViaStripe = result.payouts?.paid || [];
    const stripeLine = paidViaStripe.length
      ? ` Paid by Stripe: ${paidViaStripe.map((p) => `${p.userName || p.userID} ${money(p.amount)}`).join(', ')}.`
      : '';
    const shortLine = result.payouts?.shortfall?.length
      ? ` Stripe balance short for ${result.payouts.shortfall.map((b) => money(b.amount)).join(', ')} — retried daily.`
      : '';
    if (result.toPay.length > 0) {
      const total = result.toPay.reduce((s, b) => s + b.amount, 0);
      const names = [...new Set(result.toPay.map((b) => b.userName || b.userID))].join(', ');
      await notifyAllAdmins({
        type: 'payroll-ready',
        title: `Payroll ready: ${money(total)} to pay`,
        message: `${result.toPay.length} finalized batch${result.toPay.length === 1 ? '' : 'es'} for ${names}. Pay them and mark paid on the payroll page.${stripeLine}${shortLine}`,
        actionUrl: payrollUrl,
        actionLabel: 'Open payroll',
        priority: 'high',
        channels: ['inApp', 'email', 'push'],
        relatedType: 'payroll-run',
        relatedData: { toPay: result.toPay, ownerLedger: result.ownerLedger, errors: result.errors },
      });
    } else if (paidViaStripe.length > 0) {
      await notifyAllAdmins({
        type: 'payroll-ran',
        title: `Payroll ran — ${money(paidViaStripe.reduce((s, p) => s + p.amount, 0))} paid by Stripe`,
        message: `${stripeLine.trim()}${shortLine}${result.errors.length ? ` ${result.errors.length} batch${result.errors.length === 1 ? '' : 'es'} failed — see payroll.` : ''}`.trim(),
        actionUrl: payrollUrl,
        actionLabel: 'Open payroll',
        priority: result.errors.length ? 'normal' : 'low',
        channels: ['inApp'],
        relatedType: 'payroll-run',
        relatedData: { payouts: result.payouts, errors: result.errors },
      });
    } else if (result.ownerLedger.length > 0 || result.errors.length > 0) {
      const ledgerTotal = result.ownerLedger.reduce((s, b) => s + b.amount, 0);
      const ledgerHours = result.ownerLedger.reduce((s, b) => s + b.hours, 0);
      const weeks = result.ownerLedger.length;
      await notifyAllAdmins({
        type: 'payroll-ran',
        title: 'Payroll ran — nothing to pay',
        message: `${weeks ? `Your labor: ${money(ledgerTotal)} over ${ledgerHours.toFixed(2)} hrs (${weeks} week${weeks === 1 ? '' : 's'}), settled to the ledger.` : ''}${result.errors.length ? ` ${result.errors.length} batch${result.errors.length === 1 ? '' : 'es'} failed — see payroll.` : ''}`.trim(),
        actionUrl: payrollUrl,
        actionLabel: 'Open payroll',
        priority: result.errors.length ? 'normal' : 'low',
        channels: ['inApp'],
        relatedType: 'payroll-run',
        relatedData: { ownerLedger: result.ownerLedger, errors: result.errors },
      });
    }
  } catch (error) {
    console.error('payroll run notification failed (non-fatal):', error?.message);
  }
}
