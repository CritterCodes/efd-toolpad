import { NextResponse } from 'next/server';
import { requireRepairOpsAny, requireRole } from '@/lib/apiAuth';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { computePaymentStatus, syncPaidRepairs } from '@/app/api/repair-invoices/service';
import { createStripePaymentIntent, fetchStripePaymentIntent } from '@/app/api/repair-invoices/stripe';

const STRIPE_CARD_FEE_RATE = 0.029;
const STRIPE_CARD_FIXED_FEE = 0.30;

async function requireCloseoutAccess() {
  const adminResult = await requireRole(['admin']);
  if (!adminResult.errorResponse) return adminResult;

  return await requireRepairOpsAny(['qualityControl', 'closeoutBilling']);
}

function serializePaymentIntent(intent) {
  return {
    id: intent.id,
    status: intent.status,
    amountReceived: (intent.amount_received || 0) / 100,
    latestCharge: intent.latest_charge || '',
  };
}

function getCardPaymentAmount(baseAmount) {
  const amount = parseFloat(baseAmount || 0);
  if (!(amount > 0)) {
    return {
      baseAmount: 0,
      processingFee: 0,
      cardTotal: 0,
    };
  }

  const cardTotal = Math.ceil(((amount + STRIPE_CARD_FIXED_FEE) / (1 - STRIPE_CARD_FEE_RATE)) * 100) / 100;
  return {
    baseAmount: amount,
    processingFee: Math.max(cardTotal - amount, 0),
    cardTotal,
  };
}

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireCloseoutAccess();
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const invoice = await RepairInvoicesModel.findByInvoiceID(params.invoiceID);

    const syncIntentId = body.paymentIntentId || body.syncPaymentIntentId || '';
    if (syncIntentId) {
      const intent = await fetchStripePaymentIntent(syncIntentId);
      const payments = Array.isArray(invoice.payments) ? [...invoice.payments] : [];
      const paymentIndex = payments.findIndex((payment) => payment.paymentIntentId === syncIntentId);
      if (paymentIndex === -1) {
        return NextResponse.json({ error: 'Terminal payment record not found on invoice.' }, { status: 404 });
      }

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
        .filter((payment) => payment.status === 'completed')
        .reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
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
        paymentIntent: serializePaymentIntent(intent),
      }, { status: 200 });
    }

    const cardSummary = body.applyCardFee === true
      ? getCardPaymentAmount(invoice.remainingBalance)
      : { baseAmount: parseFloat(body.amount || invoice.remainingBalance || 0), processingFee: 0, cardTotal: parseFloat(body.amount || invoice.remainingBalance || 0) };
    const requestedAmount = cardSummary.cardTotal;
    const amountInCents = Math.round(requestedAmount * 100);
    if (!(amountInCents > 0)) {
      return NextResponse.json({ error: 'Terminal payment amount must be greater than 0.' }, { status: 400 });
    }

    const intent = await createStripePaymentIntent({
      amountInCents,
      metadata: {
        invoiceID: invoice.invoiceID,
        accountType: invoice.accountType,
        baseAmount: cardSummary.baseAmount,
        processingFee: cardSummary.processingFee,
        terminal: 'reader_m2',
      },
      cardPresent: true,
    });

    const payments = Array.isArray(invoice.payments) ? [...invoice.payments] : [];
    payments.push({
      type: 'terminal',
      amount: requestedAmount,
      baseAmount: cardSummary.baseAmount,
      processingFee: cardSummary.processingFee,
      status: 'pending',
      paymentIntentId: intent.id,
      createdAt: new Date(),
      createdBy: session.user.name || session.user.email || '',
    });

    const updated = await RepairInvoicesModel.updateByInvoiceID(invoice.invoiceID, {
      payments,
      stripeTerminalPaymentIntentId: intent.id,
      status: invoice.status === 'draft' ? 'open' : invoice.status,
    });

    return NextResponse.json({
      invoice: updated,
      paymentIntent: serializePaymentIntent(intent),
    }, { status: 200 });
  } catch (error) {
    console.error('Error handling terminal invoice payment:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
