/**
 * GET /api/admin/finance/tax-summary?year=2026[&format=csv] — 1099 readiness (services/payroll/taxSummary.js):
 * per payee, what Stripe Connect actually paid in the calendar year, plus the identity facts the payee's
 * Express account exposes (legal name, address, TIN-provided flags — never the digits). Admin/dev only.
 */
import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { db } from '@/lib/database';
import RepairPayrollBatchesModel from '@/app/api/repairPayrollBatches/model';
import { CONNECT_PAYMENT_METHOD } from '@/services/payroll/connectPayouts';
import { isStripeConfigured, retrieveAccount } from '@/lib/stripeConnect';
import { summarizeConnectPayouts, payeeTaxProfile, taxSummaryCsv, IRS_1099_THRESHOLD } from '@/services/payroll/taxSummary';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const params = req.nextUrl.searchParams;
  const year = Number(params.get('year')) || new Date().getUTCFullYear();
  const format = params.get('format') === 'csv' ? 'csv' : 'json';
  try {
    const start = new Date(Date.UTC(year, 0, 1));
    const end = new Date(Date.UTC(year + 1, 0, 1));
    const batches = await RepairPayrollBatchesModel.list({ status: 'paid', paymentMethod: CONNECT_PAYMENT_METHOD, paidAt: { $gte: start, $lt: end } });
    const userIDs = [...new Set(batches.map((b) => b.userID).filter(Boolean))];
    const dbi = await db.connect();
    const userDocs = await dbi.collection('users').find({ userID: { $in: userIDs } })
      .project({ _id: 0, userID: 1, firstName: 1, lastName: 1, email: 1, role: 1, compensationProfile: 1, stripeConnect: 1 }).toArray();
    const users = new Map(userDocs.map((u) => [u.userID, u]));
    const rows = summarizeConnectPayouts({ batches, year, users });

    // Identity from Stripe, best-effort per payee (a Stripe hiccup must not blank the money numbers).
    if (isStripeConfigured()) {
      await Promise.all(rows.map(async (r) => {
        if (!r.stripeAccountId) return;
        try { r.tax = payeeTaxProfile(await retrieveAccount(r.stripeAccountId)); } catch (e) { r.taxError = e?.message || 'Stripe lookup failed'; }
      }));
    }

    if (format === 'csv') {
      return new NextResponse(taxSummaryCsv(rows, year), {
        headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="efd-1099-summary-${year}.csv"` },
      });
    }
    return NextResponse.json({ year, threshold: IRS_1099_THRESHOLD, rows, batchCount: batches.length, stripe: isStripeConfigured() });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Could not build the summary.' }, { status: 500 });
  }
}
