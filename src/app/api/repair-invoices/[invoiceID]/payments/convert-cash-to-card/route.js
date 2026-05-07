import { NextResponse } from 'next/server';
import { requireRepairOpsAny, requireRole } from '@/lib/apiAuth';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { syncPaidRepairs } from '@/app/api/repair-invoices/service';

const CARD_SURCHARGE_RATE = 0.03;

async function requireCloseoutAccess() {
  const adminResult = await requireRole(['admin']);
  if (!adminResult.errorResponse) return adminResult;

  return await requireRepairOpsAny(['qualityControl', 'closeoutBilling']);
}

function roundMoney(value) {
  return Math.round(parseFloat(value || 0) * 100) / 100;
}

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireCloseoutAccess();
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const invoice = await RepairInvoicesModel.findByInvoiceID(params.invoiceID);
    const payments = Array.isArray(invoice.payments) ? [...invoice.payments] : [];
    const completedCashIndexes = payments
      .map((payment, index) => ({ payment, index }))
      .filter(({ payment }) => payment.type === 'cash' && payment.status === 'completed')
      .map(({ index }) => index);

    if (completedCashIndexes.length === 0) {
      return NextResponse.json({ error: 'No completed cash payment was found to convert.' }, { status: 400 });
    }

    const completedNonCashTotal = payments
      .filter((payment) => payment.status === 'completed' && payment.type !== 'cash')
      .reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
    if (completedNonCashTotal > 0) {
      return NextResponse.json({ error: 'Cash-to-card correction only supports invoices paid entirely as cash.' }, { status: 400 });
    }

    const grossTotal = roundMoney(
      parseFloat(invoice.subtotal || 0)
      + parseFloat(invoice.taxAmount || 0)
      + parseFloat(invoice.deliveryFee || 0)
    );
    const processingFee = roundMoney(grossTotal * CARD_SURCHARGE_RATE);
    const cardTotal = roundMoney(grossTotal + processingFee);
    const lastCashIndex = completedCashIndexes[completedCashIndexes.length - 1];
    let assignedAmount = 0;

    const correctedPayments = payments.map((payment, index) => {
      if (!completedCashIndexes.includes(index)) return payment;

      const isLastCashPayment = index === lastCashIndex;
      const correctedAmount = isLastCashPayment
        ? roundMoney(cardTotal - assignedAmount)
        : roundMoney(payment.amount || 0);
      assignedAmount = roundMoney(assignedAmount + correctedAmount);

      return {
        ...payment,
        type: 'credit_card',
        amount: correctedAmount,
        baseAmount: isLastCashPayment ? grossTotal : parseFloat(payment.amount || 0),
        processingFee: isLastCashPayment ? processingFee : 0,
        originalType: payment.originalType || 'cash',
        originalAmount: payment.originalAmount ?? payment.amount,
        correctedAt: new Date(),
        correctedBy: session.user.name || session.user.email || '',
        correctionReason: body.reason || 'Cash payment was actually collected by credit card.',
        source: 'cash_to_card_correction',
        notes: [payment.notes, body.notes || 'Corrected from cash to credit card payment.'].filter(Boolean).join(' '),
      };
    });

    let updated = await RepairInvoicesModel.updateByInvoiceID(invoice.invoiceID, {
      payments: correctedPayments,
      cashDiscountApplied: false,
      cashDiscountAmount: 0,
      total: grossTotal,
      amountPaid: cardTotal,
      paymentStatus: 'paid',
      remainingBalance: 0,
      status: 'paid',
      paidAt: invoice.paidAt || new Date(),
    });

    updated = await syncPaidRepairs(updated);

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error converting cash payment to card:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
