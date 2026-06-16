/**
 * Fee resolver (S6) — computes EFD's cut + the artisan payout for a sale line from
 * the services it rendered, per the continuum (D7). The more of the chain EFD owns,
 * the higher its cut: consignment (storefront + custody + fulfillment) ≥ hybrid ≥
 * marketplace (storefront only).
 *
 * Pure. Backward-compatible: pass a flat `consignmentRate` (the legacy path) and it
 * reproduces the existing consignment math exactly.
 */
import { DEFAULT_FEE_SCHEDULE } from '@/services/billing/feeSchedule';

function round(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

/**
 * Classify a sale's fee mode from who owns the physical chain.
 *   EFD holds + EFD ships         → consignment
 *   artisan holds + artisan ships → marketplace
 *   anything in between           → hybrid
 */
export function resolveFeeMode(context = {}) {
  const efdHolds = context.custody === 'consignment';
  const efdFulfills = context.fulfilledBy === 'efd';
  if (efdHolds && efdFulfills) return 'consignment';
  if (!efdHolds && !efdFulfills) return 'marketplace';
  return 'hybrid';
}

/**
 * @param {{ lineTotal:number, context?:object, schedule?:object, consignmentRate?:number }} args
 * @returns {{ lineTotal, efdFeeRate, efdFee, artisanPayout, mode, basis }}
 */
export function resolveFee({ lineTotal, context = {}, schedule = DEFAULT_FEE_SCHEDULE, consignmentRate = null } = {}) {
  const amount = Number(lineTotal) || 0;

  // Legacy path: an explicit flat consignment rate (no service context).
  if (consignmentRate != null && !context.custody && !context.fulfilledBy) {
    return build(amount, Number(consignmentRate) || 0, 'consignment', { legacy: true });
  }

  const mode = resolveFeeMode(context);
  let rate;
  const basis = { mode };
  if (mode === 'consignment') {
    rate = schedule.consignment;
  } else if (mode === 'marketplace') {
    rate = schedule.marketplace;
  } else {
    // hybrid: storefront base + whichever physical pillars EFD adds
    const custody = context.custody === 'consignment' ? schedule.pillars.custody : 0;
    const fulfillment = context.fulfilledBy === 'efd' ? schedule.pillars.fulfillment : 0;
    rate = schedule.pillars.storefront + custody + fulfillment;
    basis.pillars = { storefront: schedule.pillars.storefront, custody, fulfillment };
  }
  return build(amount, rate, mode, basis);
}

function build(amount, rate, mode, basis) {
  const efdFee = round(amount * rate);
  return {
    lineTotal: round(amount),
    efdFeeRate: rate,
    efdFee,
    artisanPayout: round(amount - efdFee),
    mode,
    basis,
  };
}
