import { NextResponse } from 'next/server';
import { requireRepairOpsAny, requireRole } from '@/lib/apiAuth';
import RepairInvoicesModel from '../model';

async function requireCloseoutAccess() {
  const adminResult = await requireRole(['admin']);
  if (!adminResult.errorResponse) return adminResult;

  return await requireRepairOpsAny(['qualityControl', 'closeoutBilling']);
}

export const GET = async (req, { params }) => {
  try {
    const { errorResponse } = await requireCloseoutAccess();
    if (errorResponse) return errorResponse;

    const invoice = await RepairInvoicesModel.findByInvoiceID(params.invoiceID);
    return NextResponse.json(invoice, { status: 200 });
  } catch (error) {
    console.error('Error loading repair invoice:', error.message);
    return NextResponse.json({ error: error.message }, { status: 404 });
  }
};
