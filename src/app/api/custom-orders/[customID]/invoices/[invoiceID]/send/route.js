import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { sendInvoiceToCustomer } from '@/services/customs/customInvoices.service';

/**
 * POST /api/custom-orders/[customID]/invoices/[invoiceID]/send
 *
 * Emails the customer EFD's own printable invoice. Replaces the old /checkout route, which created a
 * Stripe hosted invoice and let Stripe send the email.
 *
 * The delivery outcome is returned rather than swallowed: if the send failed, staff must see that and
 * print the invoice instead. A success toast over a dead mail server is how a customer's receipt went
 * missing for a $5,500 cash payment.
 */
export const POST = async (_req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID, invoiceID } = await params;
  try {
    const result = await sendInvoiceToCustomer(customID, invoiceID);
    if (!result.delivery?.sent) {
      // 200, not an error: the invoice IS sendable and the record is updated — only the email failed.
      return NextResponse.json({
        ...result,
        warning: `The invoice could not be emailed (${result.delivery?.error || 'unknown error'}). Print it for the customer instead.`,
      }, { status: 200 });
    }
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.code === 'BAD_REQUEST' ? 400 : 500 });
  }
};
