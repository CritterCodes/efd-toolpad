import { NextResponse } from 'next/server';
import { requireRepairOpsAny } from '@/lib/apiAuth';
import { buyInvoiceLabel } from '@/services/shipping/invoiceShipping';

const CODE_STATUS = { NOT_FOUND: 404, BAD_REQUEST: 400, FORBIDDEN: 403, BAD_GATEWAY: 502 };

/**
 * POST /api/repair-invoices/[invoiceID]/shipping/buy — buy the label for an invoice finalized as
 * Ship (Shipping & Delivery page). Same gate as the manual ship-back: receiving / closeoutBilling.
 * Money moves here (the label is charged to the EasyPost wallet), so it is a deliberate click.
 */
export const POST = async (_req, { params }) => {
  try {
    const { session, errorResponse } = await requireRepairOpsAny(['receiving', 'closeoutBilling']);
    if (errorResponse) return errorResponse;
    const { invoiceID } = await params;
    const result = await buyInvoiceLabel({ invoiceID, actor: { userID: session.user.userID, name: session.user.name } });
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    const status = CODE_STATUS[error.code] || (error.name === 'EasyPostError' ? 502 : 500);
    if (status === 500) console.error('Error buying shipping label:', error.message);
    return NextResponse.json({ error: error.message, code: error.code || '' }, { status });
  }
};
