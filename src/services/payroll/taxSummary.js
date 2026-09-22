/**
 * 1099 readiness (owner, 2026-09-22). Not a filing integration — the NUMBERS and the identity facts an
 * accountant needs, per payee, per calendar year, from what Stripe Connect actually paid:
 *
 *   total paid = Σ payout.net on batches paid by Stripe Connect in the year (fee-netted daily batches
 *                count what the payee received; weekly batches paid the full amount)
 *
 * Identity comes from the payee's Express account. Stripe never returns the tax ID digits over the
 * API — only whether one was provided/verified — so this reports legal name, address and those flags;
 * the TIN itself lives in Stripe (Stripe's 1099 tax-form product can file for Express accounts).
 * Owner-operator draws are flagged, not excluded: a single-member LLC owner does not 1099 themself.
 */
import { CONNECT_PAYMENT_METHOD } from '@/services/payroll/connectPayouts';
import { payrollTotal } from '@/services/payrollUtils';

export const IRS_1099_THRESHOLD = 600;

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/** Pure: what a batch actually put in the payee's hands. */
export function batchNetPaid(batch = {}) {
  const net = Number(batch?.payout?.net);
  return round2(Number.isFinite(net) && net > 0 ? net : payrollTotal(batch));
}

/** Pure: batches paid through Connect whose paidAt falls in `year`. */
export function connectPaidInYear(batches = [], year) {
  return (batches || []).filter((b) => {
    if (b?.status !== 'paid' || b?.paymentMethod !== CONNECT_PAYMENT_METHOD || !b?.paidAt) return false;
    const y = new Date(b.paidAt).getUTCFullYear();
    return y === Number(year);
  });
}

/** Pure: one row per payee. */
export function summarizeConnectPayouts({ batches = [], year, users = new Map() } = {}) {
  const rows = new Map();
  for (const b of connectPaidInYear(batches, year)) {
    const cur = rows.get(b.userID) || { userID: b.userID, userName: b.userName || b.userID, totalPaid: 0, batches: 0, firstPaidAt: null, lastPaidAt: null, gross: 0, fees: 0 };
    const net = batchNetPaid(b);
    cur.totalPaid = round2(cur.totalPaid + net);
    cur.gross = round2(cur.gross + payrollTotal(b));
    cur.fees = round2(cur.fees + (Number(b?.payout?.fee) || 0));
    cur.batches += 1;
    const paidAt = new Date(b.paidAt);
    if (!cur.firstPaidAt || paidAt < cur.firstPaidAt) cur.firstPaidAt = paidAt;
    if (!cur.lastPaidAt || paidAt > cur.lastPaidAt) cur.lastPaidAt = paidAt;
    rows.set(b.userID, cur);
  }
  return [...rows.values()]
    .map((r) => {
      const u = users.get(r.userID) || {};
      return {
        ...r,
        userName: [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || r.userName,
        email: u.email || '',
        role: u.role || '',
        isOwnerOperator: u?.compensationProfile?.isOwnerOperator === true,
        needs1099: r.totalPaid >= IRS_1099_THRESHOLD && u?.compensationProfile?.isOwnerOperator !== true,
        stripeAccountId: u?.stripeConnect?.accountId || '',
      };
    })
    .sort((a, b) => b.totalPaid - a.totalPaid);
}

/** Pure: the identity facts a Stripe account object exposes for a 1099 (never the TIN digits). */
export function payeeTaxProfile(account = {}) {
  const ind = account?.individual || {};
  const addr = ind.address || account?.company?.address || {};
  const legalName = [ind.first_name, ind.last_name].filter(Boolean).join(' ').trim()
    || account?.company?.name || account?.business_profile?.name || '';
  return {
    accountId: account?.id || '',
    legalName,
    businessType: account?.business_type || '',
    address: {
      line1: addr.line1 || '', line2: addr.line2 || '', city: addr.city || '', state: addr.state || '', postalCode: addr.postal_code || '', country: addr.country || '',
    },
    addressLine: [addr.line1, addr.line2, addr.city, [addr.state, addr.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', '),
    ssnLast4Provided: ind.ssn_last_4_provided === true,
    taxIdProvided: ind.id_number_provided === true || account?.company?.tax_id_provided === true,
    identityVerified: ind.verification?.status === 'verified',
    detailsSubmitted: account?.details_submitted === true,
    payoutsEnabled: account?.payouts_enabled === true,
  };
}

/** Pure: CSV for the accountant. */
export function taxSummaryCsv(rows = [], year) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['Year', 'Payee', 'Legal name (Stripe)', 'Email', 'Role', 'Owner-operator', 'Total paid (net)', 'Gross earned', 'Payout fees', 'Batches', 'First paid', 'Last paid', 'Needs 1099', 'Address (Stripe)', 'SSN last 4 on file', 'Tax ID on file', 'Identity verified', 'Stripe account'];
  const lines = rows.map((r) => [
    year, r.userName, r.tax?.legalName || '', r.email, r.role, r.isOwnerOperator ? 'yes' : 'no', r.totalPaid.toFixed(2), r.gross.toFixed(2), r.fees.toFixed(2), r.batches,
    r.firstPaidAt ? new Date(r.firstPaidAt).toISOString().slice(0, 10) : '', r.lastPaidAt ? new Date(r.lastPaidAt).toISOString().slice(0, 10) : '',
    r.needs1099 ? 'yes' : 'no', r.tax?.addressLine || '', r.tax?.ssnLast4Provided ? 'yes' : 'no', r.tax?.taxIdProvided ? 'yes' : 'no', r.tax?.identityVerified ? 'yes' : 'no', r.stripeAccountId,
  ].map(esc).join(','));
  return [header.join(','), ...lines].join('\n');
}
