import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import BusinessExpensesModel from '../model';

export const PUT = async (req, { params }) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const { expenseID } = params;

    if (!(Number(body.amount) > 0)) {
      return NextResponse.json({ error: 'Expense amount must be greater than zero.' }, { status: 400 });
    }

    const expense = await BusinessExpensesModel.updateByExpenseID(expenseID, {
      expenseDate: body.expenseDate ? new Date(body.expenseDate) : undefined,
      vendor: body.vendor,
      category: body.category,
      amount: Number(body.amount),
      paymentMethod: body.paymentMethod,
      status: body.status,
      paidAt: body.paidAt || null,
      notes: body.notes || '',
      isDeductible: body.isDeductible !== false,
    });

    return NextResponse.json(expense, { status: 200 });
  } catch (error) {
    console.error('Error in business expenses PUT:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const DELETE = async (req, { params }) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    await BusinessExpensesModel.deleteByExpenseID(params.expenseID);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in business expenses DELETE:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
