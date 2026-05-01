import { NextResponse } from 'next/server';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { createTerminalLocation, fetchStripePaymentIntent, listTerminalLocations } from '@/app/api/repair-invoices/stripe';
import { computePaymentStatus, syncPaidRepairs } from '@/app/api/repair-invoices/service';

const EFD_LOCATION = {
  displayName: 'Engel Fine Design',
  address: {
    line1: '115 N 10th St #A107',
    city: 'Fort Smith',
    state: 'AR',
    country: 'US',
    postalCode: '72901',
  },
};

function findTerminalPayment(invoice, paymentIntentId, token) {
  return (invoice.payments || []).find((payment) =>
    payment.type === 'terminal'
    && payment.paymentIntentId === paymentIntentId
    && payment.terminalSessionToken === token
  );
}

async function getTerminalLocationId() {
  if (process.env.STRIPE_TERMINAL_LOCATION_ID) {
    return process.env.STRIPE_TERMINAL_LOCATION_ID;
  }

  const locations = await listTerminalLocations();
  const existing = (locations.data || []).find((location) =>
    String(location.display_name || '').toLowerCase() === EFD_LOCATION.displayName.toLowerCase()
  );
  if (existing?.id) return existing.id;

  const location = await createTerminalLocation(EFD_LOCATION);
  return location.id;
}

export const GET = async (req) => {
  try {
    const { searchParams } = new URL(req.url);
    const invoiceID = searchParams.get('invoiceID') || '';
    const paymentIntentId = searchParams.get('paymentIntentId') || '';
    const token = searchParams.get('token') || '';

    if (!invoiceID || !paymentIntentId || !token) {
      return NextResponse.json({ error: 'invoiceID, paymentIntentId, and token are required.' }, { status: 400 });
    }

    const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID);
    const payment = findTerminalPayment(invoice, paymentIntentId, token);
    if (!payment) {
      return NextResponse.json({ error: 'Terminal session not found.' }, { status: 404 });
    }

    const intent = await fetchStripePaymentIntent(paymentIntentId);
    const locationId = await getTerminalLocationId();

    return NextResponse.json({
      invoiceID: invoice.invoiceID,
      customerName: invoice.customerName || invoice.accountID || '',
      amount: parseFloat(payment.amount || intent.amount / 100 || 0),
      baseAmount: parseFloat(payment.baseAmount || 0),
      processingFee: parseFloat(payment.processingFee || 0),
      paymentStatus: invoice.paymentStatus,
      paymentIntentId,
      clientSecret: payment.clientSecret || intent.client_secret || '',
      locationId,
      status: intent.status,
    }, { status: 200 });
  } catch (error) {
    console.error('Error loading Stripe Terminal session:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};

export const POST = async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const invoiceID = body.invoiceID || '';
    const paymentIntentId = body.paymentIntentId || '';
    const token = body.token || '';

    if (!invoiceID || !paymentIntentId || !token) {
      return NextResponse.json({ error: 'invoiceID, paymentIntentId, and token are required.' }, { status: 400 });
    }

    const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID);
    const payment = findTerminalPayment(invoice, paymentIntentId, token);
    if (!payment) {
      return NextResponse.json({ error: 'Terminal session not found.' }, { status: 404 });
    }

    const intent = await fetchStripePaymentIntent(paymentIntentId);
    const payments = Array.isArray(invoice.payments) ? [...invoice.payments] : [];
    const paymentIndex = payments.findIndex((item) => item.paymentIntentId === paymentIntentId);
    const nextStatus = intent.status === 'succeeded' ? 'completed' : intent.status === 'canceled' ? 'cancelled' : 'pending';

    payments[paymentIndex] = {
      ...payments[paymentIndex],
      amount: nextStatus === 'completed'
        ? parseFloat((intent.amount_received || intent.amount || 0) / 100)
        : payments[paymentIndex].amount,
      status: nextStatus,
      syncedAt: new Date(),
    };

    const amountPaid = payments
      .filter((item) => item.status === 'completed')
      .reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const { paymentStatus, remainingBalance } = computePaymentStatus(invoice.total, amountPaid);

    let updated = await RepairInvoicesModel.updateByInvoiceID(invoice.invoiceID, {
      payments,
      amountPaid,
      paymentStatus,
      remainingBalance,
      status: paymentStatus === 'paid' ? 'paid' : 'open',
      paidAt: paymentStatus === 'paid' ? new Date() : invoice.paidAt || null,
    });

    updated = await syncPaidRepairs(updated);

    return NextResponse.json({
      invoice: updated,
      invoiceID: updated.invoiceID,
      paymentIntentId,
      status: intent.status,
      amountReceived: (intent.amount_received || 0) / 100,
    }, { status: 200 });
  } catch (error) {
    console.error('Error syncing Stripe Terminal session:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
