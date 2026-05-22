import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { reopenPaidInvoice } from '../../service';

export const POST = async (req, { params }) => {
  try {
    const { errorResponse } = await requireRole(['admin']);
    if (errorResponse) return errorResponse;

    const updated = await reopenPaidInvoice(params.invoiceID);
    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error reopening repair invoice:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
