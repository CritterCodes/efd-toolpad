/**
 * Thursday sweep (owner, 2026-09-22): protect the payroll floor when EFD's own Stripe payout schedule
 * is MANUAL. On an automatic schedule Stripe empties the balance to the bank on its own timetable,
 * which is exactly what left transfers unfunded; on a manual schedule nothing leaves unless we say so.
 * So, the day after Wednesday's payroll clears:
 *
 *   keep   = floor + projected payroll due × (1 + buffer)     (services/payroll/payrollFunding.js numbers)
 *   excess = available − keep
 *   if excess ≥ minimumTopup → ONE payout of the excess to the bank; otherwise nothing.
 *
 * Automatic schedule → report only (the numbers still go in the result so the digest can say so).
 * Gated on the same `enabled` switch as funding (Settings → Store → Payroll funding). One payout per
 * calendar day by idempotency key; `dryRun` reports without moving money. Never throws.
 */
import { readFundingSettings, projectPayrollDue } from '@/services/payroll/payrollFunding';
import { isStripeConfigured, stripeMode, retrieveBalance, availableUsdCents, retrievePlatformAccount, payoutScheduleOf, createPlatformPayout } from '@/lib/stripeConnect';
import { notifyAllAdmins } from '@/lib/notificationService';
import { adminBase } from '@/lib/appUrls';

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const money = (n) => round2(n).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

/** Pure: how much may leave Stripe today without touching the payroll floor. */
export function computeSweep({ available = 0, projected = 0, settings = {} } = {}) {
  const floor = Number(settings.floor) || 0;
  const bufferPct = Number(settings.bufferPct) || 0;
  const minimum = Number(settings.minimumTopup) > 0 ? Number(settings.minimumTopup) : 25;
  const keep = round2(floor + projected * (1 + bufferPct / 100));
  const excess = round2(Math.max(0, available - keep));
  const sweep = excess >= minimum ? excess : 0;
  return { available: round2(available), projected: round2(projected), keep, excess, sweep };
}

/** Pure: one sweep per calendar day. */
export function sweepIdempotencyKey(now = new Date()) {
  return `payroll-sweep-${now.toISOString().slice(0, 10)}`;
}

export async function runPayrollSweep({ now = new Date(), dryRun = false, notify = true } = {}) {
  const settings = await readFundingSettings();
  const result = { ranAt: now, settings, dryRun, stripe: isStripeConfigured() ? stripeMode() : 'unconfigured', payout: null, error: null };
  if (!settings.enabled) return { ...result, skipped: 'funding is off in Store Settings' };
  if (!isStripeConfigured()) return { ...result, skipped: 'Stripe not configured' };

  try {
    const [account, balance, due] = await Promise.all([retrievePlatformAccount(), retrieveBalance(), projectPayrollDue()]);
    const schedule = payoutScheduleOf(account);
    const available = availableUsdCents(balance) / 100;
    const plan = computeSweep({ available, projected: due.projected, settings });
    Object.assign(result, { schedule, due, plan });

    if (schedule.interval !== 'manual') {
      return { ...result, skipped: `Stripe payout schedule is ${schedule.interval}${schedule.weeklyAnchor ? ` (${schedule.weeklyAnchor})` : ''} — Stripe moves the balance itself; set it to manual for the sweep to protect the floor` };
    }
    if (plan.sweep <= 0) return { ...result, skipped: `nothing above the floor: ${money(available)} available, keeping ${money(plan.keep)}` };
    if (dryRun) return { ...result, wouldPayout: plan.sweep };

    const payout = await createPlatformPayout({
      amountCents: Math.round(plan.sweep * 100),
      description: `Weekly sweep — keeping ${money(plan.keep)} for payroll (${money(settings.floor)} floor + ${money(due.projected)} due + ${settings.bufferPct}%)`,
      metadata: { available: String(plan.available), keep: String(plan.keep), projected: String(plan.projected), runAt: now.toISOString() },
      idempotencyKey: sweepIdempotencyKey(now),
    });
    result.payout = { id: payout.id, amount: plan.sweep, status: payout.status, arrivalDate: payout.arrival_date ? new Date(payout.arrival_date * 1000) : null };
    if (notify) {
      await notifyAllAdmins({
        type: 'payroll-sweep',
        title: `Swept ${money(plan.sweep)} to the bank, kept ${money(plan.keep)} for payroll`,
        message: `Stripe had ${money(available)} available. Kept ${money(settings.floor)} floor + ${money(due.projected)} projected payroll + ${settings.bufferPct}% buffer; ${money(plan.sweep)} is on its way to the bank${result.payout.arrivalDate ? `, expected ${result.payout.arrivalDate.toLocaleDateString('en-US')}` : ''}.`,
        actionUrl: `${adminBase()}/dashboard/repairs/payroll`, actionLabel: 'Open payroll',
        priority: 'low', channels: ['inApp'], relatedType: 'payroll-sweep', relatedData: result,
      }).catch(() => {});
    }
    return result;
  } catch (error) {
    result.error = error?.message || String(error);
    if (notify) {
      await notifyAllAdmins({
        type: 'payroll-sweep-failed',
        title: 'Thursday sweep could not pay out',
        message: `${result.error}. Nothing moved; the balance stays in Stripe.`,
        actionUrl: `${adminBase()}/dashboard/repairs/payroll`, actionLabel: 'Open payroll',
        priority: 'normal', channels: ['inApp', 'email'], relatedType: 'payroll-sweep', relatedData: result,
      }).catch(() => {});
    }
    return result;
  }
}
