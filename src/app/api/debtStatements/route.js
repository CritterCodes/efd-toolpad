import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import DebtAccountsModel from '../debtAccounts/model';
import DebtStatementsModel from './model';

export const POST = async (req) => {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    await DebtAccountsModel.findByDebtAccountID(body.debtAccountID);
    const statement = await DebtStatementsModel.create({
      ...body,
      createdBy: session.user.userID || session.user.email,
    });

    return NextResponse.json(statement, { status: 201 });
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 400;
    console.error('Error in debt statements POST:', error.message);
    return NextResponse.json({ error: error.message }, { status });
  }
};
