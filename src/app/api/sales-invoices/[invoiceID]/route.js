import { NextResponse } from 'next/server';
import { requireSalesPosAccess } from '@/lib/apiAuth';
import {
  getSalesInvoice,
  linkRepairToSalesInvoice,
  setSalesInvoiceCashDiscount,
  updateSalesInvoicePayment,
  voidSalesInvoice,
} from '../service';

export const GET = async (req, { params }) => {
  try {
    const { errorResponse } = await requireSalesPosAccess();
    if (errorResponse) return errorResponse;

    const { invoiceID } = await params;
    const invoice = await getSalesInvoice(invoiceID);
    return NextResponse.json({ success: true, invoice }, { status: 200 });
  } catch (error) {
    console.error('GET /api/sales-invoices/[invoiceID] error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const PATCH = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireSalesPosAccess();
    if (errorResponse) return errorResponse;

    const { invoiceID } = await params;
    const body = await req.json();
    let invoice;

    if (body.action === 'pay') {
      invoice = await updateSalesInvoicePayment(invoiceID, {
        amount: body.amount,
        method: body.method || 'cash',
        collectedBy: session.user.userID || session.user.email || '',
      });
    } else if (body.action === 'cash_discount') {
      invoice = await setSalesInvoiceCashDiscount(invoiceID, body.enabled === true);
    } else if (body.action === 'void') {
      invoice = await voidSalesInvoice(invoiceID, body.reason || '');
    } else if (body.action === 'link_repair') {
      invoice = await linkRepairToSalesInvoice(invoiceID, {
        lineID: body.lineID,
        repairID: body.repairID,
      });
    } else {
      return NextResponse.json({ error: 'Unsupported sales invoice action.' }, { status: 400 });
    }

    return NextResponse.json({ success: true, invoice }, { status: 200 });
  } catch (error) {
    console.error('PATCH /api/sales-invoices/[invoiceID] error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
