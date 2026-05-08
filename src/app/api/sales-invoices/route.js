import { NextResponse } from 'next/server';
import { requireSalesPosAccess } from '@/lib/apiAuth';
import { createSalesInvoice, listSalesInvoices } from './service';

export const GET = async (req) => {
  try {
    const { errorResponse } = await requireSalesPosAccess();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const filter = status && status !== 'all' ? { status } : {};
    const invoices = await listSalesInvoices(filter);
    return NextResponse.json({ success: true, invoices }, { status: 200 });
  } catch (error) {
    console.error('GET /api/sales-invoices error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const POST = async (req) => {
  try {
    const { session, errorResponse } = await requireSalesPosAccess();
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const invoice = await createSalesInvoice(body, session.user);
    return NextResponse.json({ success: true, invoice }, { status: 201 });
  } catch (error) {
    console.error('POST /api/sales-invoices error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
