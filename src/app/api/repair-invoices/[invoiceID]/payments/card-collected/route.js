import { NextResponse } from 'next/server';
import { requireRepairOpsAny, requireRole } from '@/lib/apiAuth';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { computePaymentStatus, syncPaidRepairs } from '@/app/api/repair-invoices/service';

async function requireCloseoutAccess() {
  const adminResult = await requireRole(['admin']);
  if (!adminResult.errorResponse) return adminResult;

  return await requireRepairOpsAny(['qualityControl', 'closeoutBilling']);
}

export const POST = async (req, { params }) => {
  try {
    const { session, errorResponse } = await requireCloseoutAccess();
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const amount = parseFloat(body.amount || 0);
    if (!(amount > 0)) {
      return NextResponse.json({ error: 'Credit card payment amount must be greater than 0.' }, { status: 400 });
    }

    const invoice = await RepairInvoicesModel.findByInvoiceID(params.invoiceID);
    const payments = Array.isArray(invoice.payments) ? [...invoice.payments] : [];
    payments.push({
      type: 'credit_card',
      amount,
      baseAmount: parseFloat(body.baseAmount || 0),
      processingFee: parseFloat(body.processingFee || 0),
      receivedAt: new Date(),
      receivedBy: session.user.name || session.user.email || '',
      notes: body.notes || 'Credit card payment collected outside app/terminal.',
      status: 'completed',
      source: 'manual_card_collected',
    });

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

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error('Error recording manual credit card payment:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
