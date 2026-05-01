import { NextResponse } from 'next/server';
import { requireRepairOpsAny, requireRole } from '@/lib/apiAuth';
import { mergeInvoices } from '../../service';

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
    const invoice = await mergeInvoices(params.invoiceID, body.targetInvoiceID || '');
    return NextResponse.json(invoice, { status: 200 });
  } catch (error) {
    console.error('Error merging repair invoices:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
