import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import DebtAccountsModel from '../model';

export const PUT = async (req, { params }) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const account = await DebtAccountsModel.updateByDebtAccountID(params.debtAccountID, body);
    return NextResponse.json(account, { status: 200 });
  } catch (error) {
    const status = error.message.includes('not found') ? 404 : 400;
    console.error('Error in debt account PUT:', error.message);
    return NextResponse.json({ error: error.message }, { status });
  }
};
