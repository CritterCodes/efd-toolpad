import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import DebtAccountsModel from '../../debtAccounts/model';
import DebtPaymentsModel from '../model';

export const PUT = async (req, { params }) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    await DebtAccountsModel.findByDebtAccountID(body.debtAccountID);
    const payment = await DebtPaymentsModel.updateByDebtPaymentID(params.debtPaymentID, body);
    return NextResponse.json(payment, { status: 200 });
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 400;
    console.error('Error in debt payment PUT:', error.message);
    return NextResponse.json({ error: error.message }, { status });
  }
};
