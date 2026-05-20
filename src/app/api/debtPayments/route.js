import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import DebtAccountsModel from '../debtAccounts/model';
import DebtPaymentsModel from './model';

export const POST = async (req) => {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const account = await DebtAccountsModel.findByDebtAccountID(body.debtAccountID);
    const payment = await DebtPaymentsModel.create({
      ...body,
      createdBy: session.user.userID || session.user.email,
    }, account);

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 400;
    console.error('Error in debt payments POST:', error.message);
    return NextResponse.json({ error: error.message }, { status });
  }
};
