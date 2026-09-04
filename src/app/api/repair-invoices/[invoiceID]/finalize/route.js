import { NextResponse } from 'next/server';
import { requireRepairOpsAny, requireRole } from '@/lib/apiAuth';
import RepairInvoicesModel from '../../model';
import { notifyWholesaleInvoiceFinalized } from '@/services/wholesale/invoiceNotifications';

async function requireCloseoutAccess() {
  const adminResult = await requireRole(['admin']);
  if (!adminResult.errorResponse) return adminResult;

  return await requireRepairOpsAny(['qualityControl', 'closeoutBilling']);
}

export const POST = async (req, { params }) => {
  try {
    const { errorResponse } = await requireCloseoutAccess();
    if (errorResponse) return errorResponse;

    const invoice = await RepairInvoicesModel.findByInvoiceID(params.invoiceID);
    const updated = await RepairInvoicesModel.updateByInvoiceID(invoice.invoiceID, {
      status: invoice.paymentStatus === 'paid' ? 'paid' : 'open',
    });

    // Finalize is the moment a wholesale draft becomes a bill the partner owes — tell them
    // (in-app + push + email). Best-effort and deduped by the partnerNotifiedAt stamp, so a
    // re-finalize can't spam; the summary rides back so the closeout UI can report delivery
    // honestly instead of assuming it.
    const notification = await notifyWholesaleInvoiceFinalized(updated);

    return NextResponse.json({ ...updated, notification }, { status: 200 });
  } catch (error) {
    console.error('Error finalizing repair invoice:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
