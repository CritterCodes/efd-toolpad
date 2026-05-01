import { NextResponse } from 'next/server';
import { requireRepairOpsAny, requireRole } from '@/lib/apiAuth';
import { updateInvoiceDelivery } from '../../service';

async function requireCloseoutAccess() {
  const adminResult = await requireRole(['admin']);
  if (!adminResult.errorResponse) return adminResult;

  return await requireRepairOpsAny(['qualityControl', 'closeoutBilling']);
}

export const POST = async (req, { params }) => {
  try {
    const { errorResponse } = await requireCloseoutAccess();
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const invoice = await updateInvoiceDelivery(params.invoiceID, body);
    return NextResponse.json(invoice, { status: 200 });
  } catch (error) {
    console.error('Error updating invoice delivery:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
