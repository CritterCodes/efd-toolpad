/**
 * Billing modes — the canonical way a source (repair, custom, sale-service) is
 * charged. Replaces the ad-hoc `compRepair` / `includedWithSale` / `isWholesale`
 * flags. See docs/manufacturing (D4).
 *
 * The rule that matters: `internal` and `comped` zero the *customer* charge but
 * NEVER the labor payout — the jeweler is still paid (labor logs are created
 * independent of billing mode).
 */

export const BILLING_MODE = {
  RETAIL: 'retail',       // normal customer charge
  WHOLESALE: 'wholesale', // trade pricing
  INTERNAL: 'internal',   // production / in-house — capitalized to COGS, no customer
  COMPED: 'comped',       // customer charged $0 (warranty, goodwill, included with sale)
};

export const ALL_BILLING_MODES = Object.values(BILLING_MODE);

export function isValidBillingMode(mode) {
  return ALL_BILLING_MODES.includes(mode);
}

/** Whether the customer is charged for this mode. */
export function isCustomerCharged(mode) {
  return mode !== BILLING_MODE.INTERNAL && mode !== BILLING_MODE.COMPED;
}

/** Comp reason inferred from the legacy flags (for audit). */
export function compReasonFor(repair = {}) {
  if (repair.includedWithSale === true) return 'included_with_sale';
  if (repair.compRepair === true) return 'comp';
  return null;
}

/**
 * Resolve a repair's effective billing mode.
 *
 * Precedence is deliberate: comp/internal win over everything (so the S0
 * `billing.mode: 'retail'` default can't mask a legacy comp flag), then
 * wholesale, then an explicit valid mode, then retail.
 */
export function resolveBillingMode(repair = {}) {
  const explicit = repair?.billing?.mode;

  if (explicit === BILLING_MODE.INTERNAL) return BILLING_MODE.INTERNAL;
  if (explicit === BILLING_MODE.COMPED || repair.compRepair === true || repair.includedWithSale === true) {
    return BILLING_MODE.COMPED;
  }
  if (explicit === BILLING_MODE.WHOLESALE || repair.isWholesale === true) {
    return BILLING_MODE.WHOLESALE;
  }
  return isValidBillingMode(explicit) ? explicit : BILLING_MODE.RETAIL;
}
