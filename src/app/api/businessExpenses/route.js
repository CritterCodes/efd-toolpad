import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import BusinessExpensesModel from './model';

export const GET = async (req) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const filter = {};

    if (searchParams.get('startDate') || searchParams.get('endDate')) {
      filter.expenseDate = {};
      if (searchParams.get('startDate')) filter.expenseDate.$gte = new Date(searchParams.get('startDate'));
      if (searchParams.get('endDate')) filter.expenseDate.$lte = new Date(searchParams.get('endDate'));
    }

    if (searchParams.get('category')) {
      filter.category = searchParams.get('category');
    }

    const expenses = await BusinessExpensesModel.list(filter);
    return NextResponse.json({ expenses }, { status: 200 });
  } catch (error) {
    console.error('Error in business expenses GET:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const POST = async (req) => {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    if (!(Number(body.amount) > 0)) {
      return NextResponse.json({ error: 'Expense amount must be greater than zero.' }, { status: 400 });
    }

    const expense = await BusinessExpensesModel.create({
      expenseDate: body.expenseDate,
      vendor: body.vendor,
      category: body.category,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      status: body.status,
      paidAt: body.paidAt,
      notes: body.notes,
      isDeductible: body.isDeductible,
      createdBy: session.user.userID || session.user.email,
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error('Error in business expenses POST:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
