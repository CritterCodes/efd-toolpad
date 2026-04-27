import { NextResponse } from 'next/server';
import { requireRepairOpsAny, requireRole } from '@/lib/apiAuth';
import RepairInvoicesModel from '../../model';

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

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error finalizing repair invoice:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
