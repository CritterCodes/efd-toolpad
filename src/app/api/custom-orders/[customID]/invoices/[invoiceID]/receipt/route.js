import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { sendCustomReceiptEmail } from '@/services/customs/customInvoiceDelivery';
import CustomInvoicesModel from '@/app/api/custom-orders/invoices/model';

/**
 * POST /api/custom-orders/[customID]/invoices/[invoiceID]/receipt — (re)send the receipt.
 *
 * Marking paid already emails one, so this is the RESEND path, and it is not a nicety: every receipt
 * this app ever "sent" failed silently (see lib/email.js — the credential was under a different key
 * name), so every paid invoice predating that fix has a customer who never got their receipt. Without
 * this there is no way to put that right from the UI.
 */
export const POST = async (_req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID, invoiceID } = await params;
  try {
    const invoice = await CustomInvoicesModel.findById(invoiceID);
    if (!invoice || invoice.customID !== customID) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    }
    // A receipt for an unpaid invoice would be a false record.
    if (invoice.status !== 'paid') {
      return NextResponse.json({ error: 'This invoice is not paid, so it has no receipt.' }, { status: 400 });
    }

    const { doc, delivery } = await sendCustomReceiptEmail(customID, invoiceID);
    if (!delivery.sent) {
      return NextResponse.json({
        delivery,
        warning: `The receipt could not be emailed (${delivery.error}). Print it instead.`,
      }, { status: 200 });
    }
    return NextResponse.json({ delivery, balanceDue: doc.balanceDue, to: doc.customerEmail }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
