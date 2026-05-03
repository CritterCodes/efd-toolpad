import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import StullerInvoicesModel from '@/app/api/stullerInvoices/model';
import { syncStullerInvoices } from '@/services/stuller/stullerSync';

export const GET = async (req) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const purchaseOrderNumber = searchParams.get('purchaseOrderNumber');
    const invoiceNumber = searchParams.get('invoiceNumber');
    const filter = {};
    if (purchaseOrderNumber) filter.purchaseOrderNumber = purchaseOrderNumber;
    if (invoiceNumber) filter.invoiceNumber = invoiceNumber;

    const invoices = await StullerInvoicesModel.list(filter);
    return NextResponse.json({ invoices }, { status: 200 });
  } catch (error) {
    console.error('Error in Stuller invoices GET:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
};

export const POST = async (req) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const result = await syncStullerInvoices({
      purchaseOrderNumbers: body.purchaseOrderNumbers || body.purchaseOrderNumber || [],
      invoiceNumbers: body.invoiceNumbers || body.invoiceNumber || [],
      recentDays: body.recentDays ?? null,
      syncAll: body.syncAll === true,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error in Stuller invoices POST:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
};
