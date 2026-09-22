/**
 * POST /api/repair-invoices/[invoiceID]/pay-link — staff-side handle on the retail pay-ahead link
 * (services/repairs/readyForPickup.js). Returns the public /pay/<token> URL (stamping a token if the
 * invoice has none) and, with { resend: true }, re-sends the ready-for-pickup notice to the customer.
 * Same access as the rest of closeout: admin, or repair-ops with QC / closeout capability.
 */
import { NextResponse } from 'next/server';
import { requireRepairOpsAny, requireRole } from '@/lib/apiAuth';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { ensureInvoicePayToken, payLinkFor, notifyReadyForPickup } from '@/services/repairs/readyForPickup';

async function requireCloseoutAccess() {
  const adminResult = await requireRole(['admin', 'dev']);
  if (!adminResult.errorResponse) return adminResult;
  return await requireRepairOpsAny(['qualityControl', 'closeoutBilling']);
}

export async function POST(req, { params }) {
  const { session, errorResponse } = await requireCloseoutAccess();
  if (errorResponse) return errorResponse;
  const { invoiceID } = await params;
  const body = await req.json().catch(() => ({}));
  try {
    const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID);
    if (!invoice) return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    if (invoice.accountType !== 'retail') return NextResponse.json({ error: 'Pay links are for retail invoices; stores pay from their Billing page.' }, { status: 400 });

    const token = await ensureInvoicePayToken(invoice);
    const url = payLinkFor(token);
    let resent = [];
    if (body?.resend === true) {
      const actor = session.user.name || session.user.email || session.user.userID;
      resent = await Promise.all((invoice.repairIDs || []).map(async (repairID) => ({ repairID, ...(await notifyReadyForPickup({ repairID, invoiceID, actor, force: true })) })));
    }
    return NextResponse.json({ url, resent });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Could not build the pay link.' }, { status: 500 });
  }
}
