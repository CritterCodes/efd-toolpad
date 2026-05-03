import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import RecurringBusinessExpensesModel from './model';
import { generateDueRecurringExpenses } from './service';

export const GET = async () => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const recurringExpenses = await RecurringBusinessExpensesModel.list({});
    return NextResponse.json({ recurringExpenses }, { status: 200 });
  } catch (error) {
    console.error('Error in recurring business expenses GET:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const POST = async (req) => {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    if (!(Number(body.amount) > 0)) {
      return NextResponse.json({ error: 'Recurring expense amount must be greater than zero.' }, { status: 400 });
    }

    const recurringExpense = await RecurringBusinessExpensesModel.create({
      ...body,
      createdBy: session.user.userID || session.user.email,
    });

    return NextResponse.json(recurringExpense, { status: 201 });
  } catch (error) {
    console.error('Error in recurring business expenses POST:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const PATCH = async (req) => {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const result = await generateDueRecurringExpenses({
      throughDate: body.throughDate || new Date(),
      createdBy: session.user.userID || session.user.email,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error in recurring business expenses PATCH:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};
