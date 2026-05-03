import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import BusinessExpensesModel from '@/app/api/businessExpenses/model';
import StullerInvoicesModel from '@/app/api/stullerInvoices/model';
import { BUSINESS_EXPENSE_STATUS } from '@/services/businessExpenses';

export const POST = async (_req, { params }) => {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const invoice = await StullerInvoicesModel.findByID(params.invoiceId);
    if (!invoice) {
      return NextResponse.json({ error: 'Stuller invoice not found.' }, { status: 404 });
    }

    const existingExpense = await BusinessExpensesModel.findBySourceReference('stuller_invoice', invoice.stullerInvoiceID);
    if (existingExpense) {
      return NextResponse.json(
        { error: 'An expense already exists for this Stuller invoice.', expense: existingExpense },
        { status: 409 }
      );
    }

    const expense = await BusinessExpensesModel.create({
      expenseDate: invoice.invoiceDate || invoice.orderDate || new Date(),
      vendor: 'Stuller',
      category: 'Materials / Parts',
      amount: Number(invoice.total || invoice.orderTotal || 0),
      paymentMethod: 'other',
      status: BUSINESS_EXPENSE_STATUS.SCHEDULED,
      notes: `Imported from Stuller invoice ${invoice.invoiceNumber || ''} / PO ${invoice.purchaseOrderNumber || ''}`.trim(),
      isDeductible: true,
      sourceType: 'stuller',
      sourceReferenceType: 'stuller_invoice',
      sourceReferenceID: invoice.stullerInvoiceID,
      createdBy: session.user.userID || session.user.email,
    });

    return NextResponse.json({ expense, invoice }, { status: 201 });
  } catch (error) {
    console.error('Error creating expense from Stuller invoice:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
};
