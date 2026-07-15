import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { createInvoiceCheckout } from '@/services/customs/customInvoices.service';

const CODE_STATUS = {
  BAD_REQUEST: 400,
  STRIPE_NOT_CONFIGURED: 503,
  STRIPE_LIVE_REQUIRED: 503,
  STRIPE_REQUEST_FAILED: 502,
};

/**
 * POST /api/custom-orders/[customID]/invoices/[invoiceID]/checkout
 * Create/finalize a hosted Stripe Invoice and have Stripe email it to the client.
 * Payment is confirmed asynchronously by the invoice.paid webhook.
 */
export const POST = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID, invoiceID } = await params;
  try {
    const result = await createInvoiceCheckout(customID, invoiceID);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: CODE_STATUS[error.code] || 500 });
  }
};
