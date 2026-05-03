import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import InventoryTransactionsModel from './model';
import { recordInventoryTransaction } from '@/services/inventoryWorkflow';

export const GET = async (req) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const filter = {};
    if (searchParams.get('inventoryItemID')) {
      filter.inventoryItemID = searchParams.get('inventoryItemID');
    }
    if (searchParams.get('transactionType')) {
      filter.transactionType = searchParams.get('transactionType');
    }
    if (searchParams.get('sourceType')) {
      filter.sourceType = searchParams.get('sourceType');
    }

    const transactions = await InventoryTransactionsModel.list(filter);
    return NextResponse.json({ transactions }, { status: 200 });
  } catch (error) {
    console.error('Error in inventory-transactions GET:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
};

export const POST = async (req) => {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const result = await recordInventoryTransaction({
      ...body,
      createdBy: session.user.userID || session.user.email,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error in inventory-transactions POST:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
};
