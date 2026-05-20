import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import DebtAccountsModel from './model';
import DebtStatementsModel from '../debtStatements/model';
import DebtPaymentsModel from '../debtPayments/model';

export const GET = async () => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const [accounts, statements, payments] = await Promise.all([
      DebtAccountsModel.list({}),
      DebtStatementsModel.list({}),
      DebtPaymentsModel.list({}),
    ]);

    return NextResponse.json({ accounts, statements, payments }, { status: 200 });
  } catch (error) {
    console.error('Error in debt accounts GET:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const POST = async (req) => {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const account = await DebtAccountsModel.create({
      ...body,
      createdBy: session.user.userID || session.user.email,
    });

    return NextResponse.json(account, { status: 201 });
  } catch (error) {
    const status = error.message.includes('required') || error.message.includes('negative') ? 400 : 500;
    console.error('Error in debt accounts POST:', error.message);
    return NextResponse.json({ error: error.message }, { status });
  }
};
