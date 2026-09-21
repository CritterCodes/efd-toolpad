import { NextResponse } from 'next/server';
import { requireRepairOpsAny, requireRole } from '@/lib/apiAuth';
import RepairInvoicesModel from '../../../model';
import { quoteInvoiceShipping, shippingReadinessForInvoice } from '@/services/shipping/invoiceShipping';

const CODE_STATUS = { NOT_FOUND: 404, BAD_REQUEST: 400, FORBIDDEN: 403, BAD_GATEWAY: 502 };

async function requireCloseoutAccess() {
  const adminResult = await requireRole(['admin']);
  if (!adminResult.errorResponse) return adminResult;
  return await requireRepairOpsAny(['qualityControl', 'closeoutBilling']);
}

/**
 * GET  /api/repair-invoices/[invoiceID]/shipping/rates — readiness: can this invoice ship, which
 *      parcels are offered, what's missing (EasyPost key, shop address, store address).
 * POST /api/repair-invoices/[invoiceID]/shipping/rates  { parcelKey } — live FedEx rates for a draft.
 *      Creates the EasyPost shipment (nothing bought) and stores the quote on the invoice.
 */
export const GET = async (_req, { params }) => {
  try {
    const { errorResponse } = await requireCloseoutAccess();
    if (errorResponse) return errorResponse;
    const { invoiceID } = await params;
    const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID);
    if (!invoice) return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    const readiness = await shippingReadinessForInvoice(invoice);
    return NextResponse.json({ ...readiness, quote: invoice.shippingQuote || null }, { status: 200 });
  } catch (error) {
    console.error('Error reading shipping readiness:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireCloseoutAccess();
    if (errorResponse) return errorResponse;
    const { invoiceID } = await params;
    const body = await req.json().catch(() => ({}));
    const quote = await quoteInvoiceShipping({
      invoiceID,
      parcelKey: body?.parcelKey || '',
      saturdayDelivery: body?.saturdayDelivery === true,
      actor: { userID: session.user.userID, name: session.user.name },
    });
    return NextResponse.json(quote, { status: 200 });
  } catch (error) {
    const status = CODE_STATUS[error.code] || (error.name === 'EasyPostError' ? 502 : 500);
    if (status === 500) console.error('Error quoting invoice shipping:', error.message);
    return NextResponse.json({ error: error.message, code: error.code || '' }, { status });
  }
};
