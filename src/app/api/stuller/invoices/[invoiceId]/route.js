import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import StullerInvoicesModel from '@/app/api/stullerInvoices/model';

export const GET = async (_req, { params }) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const invoice = await StullerInvoicesModel.findByID(params.invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: 'Stuller invoice not found.' }, { status: 404 });
    }

    return NextResponse.json({ invoice }, { status: 200 });
  } catch (error) {
    console.error('Error in Stuller invoice detail GET:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
};
