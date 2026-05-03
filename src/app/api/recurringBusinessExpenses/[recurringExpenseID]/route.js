import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import RecurringBusinessExpensesModel from '../model';

export const PUT = async (req, { params }) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    if (!(Number(body.amount) > 0)) {
      return NextResponse.json({ error: 'Recurring expense amount must be greater than zero.' }, { status: 400 });
    }

    const recurringExpense = await RecurringBusinessExpensesModel.updateByRecurringExpenseID(
      params.recurringExpenseID,
      body
    );
    return NextResponse.json(recurringExpense, { status: 200 });
  } catch (error) {
    console.error('Error in recurring business expenses PUT:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const DELETE = async (_req, { params }) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    await RecurringBusinessExpensesModel.deleteByRecurringExpenseID(params.recurringExpenseID);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in recurring business expenses DELETE:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
