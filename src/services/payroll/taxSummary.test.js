import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/database', () => ({ db: { connect: vi.fn() } }));
vi.mock('@/app/api/repairPayrollBatches/model', () => ({ default: {} }));
vi.mock('@/app/api/repairs/payroll/service', () => ({ markPayrollBatchPaid: vi.fn() }));
vi.mock('@/lib/notificationService', () => ({ notifyAllAdmins: vi.fn() }));
vi.mock('@/lib/appUrls', () => ({ adminBase: () => 'http://test' }));

import { batchNetPaid, connectPaidInYear, summarizeConnectPayouts, payeeTaxProfile, taxSummaryCsv, IRS_1099_THRESHOLD } from './taxSummary';

const paid = (over) => ({ status: 'paid', paymentMethod: 'stripe-connect', paidAt: '2026-09-25T12:00:00Z', laborPay: 500, salePay: 0, totalPay: 500, userID: 'u1', userName: 'Michelle', ...over });

describe('batchNetPaid / connectPaidInYear (pure)', () => {
  it('net of a daily batch is what the payee received; a weekly batch is the full amount', () => {
    expect(batchNetPaid(paid({ payout: { gross: 100, fee: 1.5, net: 98.5 } }))).toBe(98.5);
    expect(batchNetPaid(paid())).toBe(500);
    expect(batchNetPaid(paid({ totalPay: undefined, laborPay: 516, salePay: 496 }))).toBe(516); // legacy shape
  });
  it('only Connect-paid batches in the year count', () => {
    const rows = connectPaidInYear([
      paid(), paid({ paidAt: '2025-12-31T23:00:00Z' }), paid({ paymentMethod: 'cash' }), paid({ status: 'finalized', paidAt: null }),
    ], 2026);
    expect(rows).toHaveLength(1);
  });
});

describe('summarizeConnectPayouts (pure)', () => {
  it('sums per payee, flags the $600 threshold, exempts the owner-operator, sorts by total', () => {
    const users = new Map([
      ['u1', { firstName: 'Michelle', lastName: 'Grazier', email: 'm@x', role: 'artisan', stripeConnect: { accountId: 'acct_m' } }],
      ['owner', { firstName: 'Jacob', lastName: 'Engel', role: 'admin', compensationProfile: { isOwnerOperator: true } }],
    ]);
    const rows = summarizeConnectPayouts({ year: 2026, users, batches: [
      paid(), paid({ paidAt: '2026-10-02T12:00:00Z', totalPay: 150, laborPay: 150, payout: { gross: 150, fee: 2, net: 148 } }),
      paid({ userID: 'owner', userName: 'jacob engel', totalPay: 900, laborPay: 900 }),
      paid({ userID: 'u2', userName: 'Kira', totalPay: 40, laborPay: 40 }),
    ] });
    expect(rows.map((r) => r.userID)).toEqual(['owner', 'u1', 'u2']);
    const m = rows.find((r) => r.userID === 'u1');
    expect(m).toMatchObject({ userName: 'Michelle Grazier', email: 'm@x', totalPaid: 648, gross: 650, fees: 2, batches: 2, needs1099: true, stripeAccountId: 'acct_m' });
    expect(new Date(m.firstPaidAt).toISOString()).toBe('2026-09-25T12:00:00.000Z');
    expect(rows.find((r) => r.userID === 'owner')).toMatchObject({ isOwnerOperator: true, needs1099: false, totalPaid: 900 });
    expect(rows.find((r) => r.userID === 'u2').needs1099).toBe(false);
    expect(IRS_1099_THRESHOLD).toBe(600);
  });
});

describe('payeeTaxProfile (pure)', () => {
  it('reads legal name, address and the provided/verified flags — never a TIN', () => {
    const p = payeeTaxProfile({ id: 'acct_m', business_type: 'individual', details_submitted: true, payouts_enabled: true,
      individual: { first_name: 'Michelle', last_name: 'Grazier', ssn_last_4_provided: true, id_number_provided: false, verification: { status: 'verified' }, address: { line1: '1 Main St', city: 'Fort Smith', state: 'AR', postal_code: '72901', country: 'US' } } });
    expect(p).toMatchObject({ accountId: 'acct_m', legalName: 'Michelle Grazier', ssnLast4Provided: true, taxIdProvided: false, identityVerified: true, addressLine: '1 Main St, Fort Smith, AR 72901' });
    expect(JSON.stringify(p)).not.toMatch(/\d{3}-\d{2}-\d{4}/);
    expect(payeeTaxProfile({}).legalName).toBe('');
  });
});

describe('taxSummaryCsv (pure)', () => {
  it('one header + one line per payee, quoting fields with commas', () => {
    const csv = taxSummaryCsv([{ userName: 'Grazier, Michelle', email: 'm@x', role: 'artisan', isOwnerOperator: false, totalPaid: 648, gross: 650, fees: 2, batches: 2, firstPaidAt: '2026-09-25T12:00:00Z', lastPaidAt: '2026-10-02T12:00:00Z', needs1099: true, stripeAccountId: 'acct_m', tax: { legalName: 'Michelle Grazier', addressLine: '1 Main St, Fort Smith, AR 72901', ssnLast4Provided: true, taxIdProvided: false, identityVerified: true } }], 2026);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^Year,Payee,Legal name/);
    expect(lines[1]).toContain('"Grazier, Michelle"');
    expect(lines[1]).toContain(',648.00,650.00,2.00,2,2026-09-25,2026-10-02,yes,');
  });
});
