/**
 * POST /api/repair-invoices/[invoiceID]/picked-up — the handover for an invoice the customer PAID AHEAD
 * through the public pay link. An online payment marks the invoice paid but deliberately leaves the
 * repairs READY FOR PICKUP (the piece is still in the shop); this closes them (PAID_CLOSED) when the
 * customer actually collects, the same way a counter payment does.
 */
import { NextResponse } from 'next/server';
import { requireRepairOpsAny, requireRole } from '@/lib/apiAuth';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { syncPaidRepairs } from '@/app/api/repair-invoices/service';

async function requireCloseoutAccess() {
  const adminResult = await requireRole(['admin', 'dev']);
  if (!adminResult.errorResponse) return adminResult;
  return await requireRepairOpsAny(['qualityControl', 'closeoutBilling']);
}

export async function POST(_req, { params }) {
  const { session, errorResponse } = await requireCloseoutAccess();
  if (errorResponse) return errorResponse;
  const { invoiceID } = await params;
  try {
    const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID);
    if (invoice.paymentStatus !== 'paid') return NextResponse.json({ error: 'This invoice is not paid yet.' }, { status: 409 });
    await syncPaidRepairs(invoice);
    const now = new Date();
    const updated = await RepairInvoicesModel.updateByInvoiceID(invoiceID, {
      pickedUpAt: now,
      pickedUpBy: session.user.name || session.user.email || session.user.userID || '',
    });
    return NextResponse.json({ ok: true, invoice: updated });
  } catch (error) {
    return NextResponse.json({ error: error.message || 'Could not mark picked up.' }, { status: 500 });
  }
}
