import { NextResponse } from 'next/server';
import { requireRepairOpsAny, requireRole } from '@/lib/apiAuth';
import RepairInvoicesModel from '@/app/api/repair-invoices/model';
import { createTerminalConnectionToken } from '@/app/api/repair-invoices/stripe';

async function requireTerminalAccess() {
  const adminResult = await requireRole(['admin']);
  if (!adminResult.errorResponse) return adminResult;

  return await requireRepairOpsAny(['qualityControl', 'closeoutBilling']);
}

export const POST = async (req) => {
  try {
    const body = await req?.json?.().catch(() => ({})) || {};
    const invoiceID = body.invoiceID || '';
    const paymentIntentId = body.paymentIntentId || '';
    const sessionToken = body.token || '';

    if (invoiceID && paymentIntentId && sessionToken) {
      const invoice = await RepairInvoicesModel.findByInvoiceID(invoiceID);
      const terminalPayment = (invoice.payments || []).find((payment) =>
        payment.type === 'terminal'
        && payment.paymentIntentId === paymentIntentId
        && payment.terminalSessionToken === sessionToken
      );

      if (!terminalPayment) {
        return NextResponse.json({ error: 'Terminal session not found.' }, { status: 404 });
      }
    } else {
      const { errorResponse } = await requireTerminalAccess();
      if (errorResponse) return errorResponse;
    }

    const token = await createTerminalConnectionToken();
    return NextResponse.json({ secret: token.secret }, { status: 200 });
  } catch (error) {
    console.error('Error creating Stripe Terminal connection token:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
