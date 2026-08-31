import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { adminBase } from '@/lib/appUrls';
import {
  invoiceBelongsToSession,
  createInvoiceCheckoutSession,
  cardConvenienceFee,
} from '@/services/wholesale/invoicePayments';

/**
 * POST /api/wholesale/invoices/[invoiceID]/pay — start an online payment.
 * Body: { method: 'ach' | 'card' }
 *
 * Returns the Stripe Checkout URL; the browser redirects there and Stripe owns
 * the payment UI (bank connect for ACH, card form for cards). ACH carries no
 * fee (the shop eats it); card adds the disclosed convenience fee as its own
 * Checkout line. The invoice is only ever marked paid by the WEBHOOK — never
 * by the redirect back, which any user can fabricate.
 */
export async function POST(request, { params }) {
  const { session, errorResponse } = await requireRole(['wholesaler', 'admin', 'dev']);
  if (errorResponse) return errorResponse;

  try {
    const { invoiceID } = await params;
    const body = await request.json().catch(() => ({}));
    const method = body?.method === 'card' ? 'card' : 'ach';

    const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID);
    // 404 for missing AND foreign — a guessed invoiceID must not confirm existence.
    if (!invoice || !(await invoiceBelongsToSession(session, invoice))) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    }
    if (invoice.status !== 'open' || invoice.paymentStatus === 'paid' || !(Number(invoice.remainingBalance) > 0)) {
      return NextResponse.json({ error: 'This invoice has no open balance to pay.' }, { status: 409 });
    }

    const base = adminBase();
    const checkout = await createInvoiceCheckoutSession({
      invoice,
      method,
      successUrl: `${base}/dashboard/wholesaler/billing?paid=${encodeURIComponent(invoiceID)}&method=${method}`,
      cancelUrl: `${base}/dashboard/wholesaler/billing?cancelled=1`,
    });

    return NextResponse.json({
      success: true,
      url: checkout.url,
      base: checkout.base,
      fee: checkout.fee,
    });
  } catch (error) {
    console.error('POST /api/wholesale/invoices/[invoiceID]/pay error:', error);
    return NextResponse.json({ error: 'Could not start the payment.' }, { status: 500 });
  }
}

/**
 * GET — quote the payment options for the dialog (base + card fee), so the fee
 * the wholesaler sees before choosing is computed by the same function that
 * builds the charge.
 */
export async function GET(request, { params }) {
  const { session, errorResponse } = await requireRole(['wholesaler', 'admin', 'dev']);
  if (errorResponse) return errorResponse;

  try {
    const { invoiceID } = await params;
    const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID);
    if (!invoice || !(await invoiceBelongsToSession(session, invoice))) {
      return NextResponse.json({ error: 'Invoice not found.' }, { status: 404 });
    }
    const balance = Math.round((Number(invoice.remainingBalance) || 0) * 100) / 100;
    return NextResponse.json({
      success: true,
      balance,
      ach: { total: balance, fee: 0 },
      card: { total: Math.round((balance + cardConvenienceFee(balance)) * 100) / 100, fee: cardConvenienceFee(balance) },
    });
  } catch (error) {
    console.error('GET /api/wholesale/invoices/[invoiceID]/pay error:', error);
    return NextResponse.json({ error: 'Could not load payment options.' }, { status: 500 });
  }
}
