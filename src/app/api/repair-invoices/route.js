import { NextResponse } from 'next/server';
import { requireRepairOpsAny, requireRole } from '@/lib/apiAuth';
import RepairInvoicesModel from './model';
import { createRepairInvoice } from './service';

async function requireCloseoutAccess() {
  const adminResult = await requireRole(['admin']);
  if (!adminResult.errorResponse) return adminResult;

  return await requireRepairOpsAny(['qualityControl', 'closeoutBilling']);
}

export const GET = async (req) => {
  try {
    const { errorResponse } = await requireCloseoutAccess();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const filter = status ? { status } : {};

    const invoices = await RepairInvoicesModel.findAll(filter);
    return NextResponse.json(invoices, { status: 200 });
  } catch (error) {
    console.error('Error loading repair invoices:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
};

export const POST = async (req) => {
  try {
    const { session, errorResponse } = await requireCloseoutAccess();
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const invoice = await createRepairInvoice({
      repairIDs: body.repairIDs || [],
      deliveryMethod: body.deliveryMethod || 'pickup',
      deliveryFee: body.deliveryFee,
      closeoutNotes: body.closeoutNotes || '',
      createdBy: session.user.name || session.user.email || '',
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error('Error creating repair invoice:', error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
};
