import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import {
  createInventoryItem,
  listInventoryItems,
} from '@/services/inventoryWorkflow';

export const GET = async (req) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const includeInactive = searchParams.get('includeInactive') !== 'false';
    const inventoryItems = await listInventoryItems({ includeInactive });
    return NextResponse.json({ inventoryItems }, { status: 200 });
  } catch (error) {
    console.error('Error in inventory-items GET:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
};

export const POST = async (req) => {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const inventoryItem = await createInventoryItem(body, session.user.userID || session.user.email);
    return NextResponse.json({ inventoryItem }, { status: 201 });
  } catch (error) {
    console.error('Error in inventory-items POST:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
};
