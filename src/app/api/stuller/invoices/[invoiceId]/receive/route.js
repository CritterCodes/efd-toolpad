import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { receiveStullerInvoice } from '@/services/inventoryWorkflow';

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const result = await receiveStullerInvoice({
      invoiceId: params.invoiceId,
      lineReceipts: Array.isArray(body.lineReceipts) ? body.lineReceipts : [],
      createdBy: session.user.userID || session.user.email,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error in Stuller invoice receive POST:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
};
