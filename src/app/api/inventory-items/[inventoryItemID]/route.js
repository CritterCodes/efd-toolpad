import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import InventoryItemsModel from '@/app/api/inventory-items/model';
import {
  deleteInventoryItem,
  updateInventoryItem,
} from '@/services/inventoryWorkflow';

export const GET = async (_req, { params }) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const inventoryItem = await InventoryItemsModel.findByInventoryItemID(params.inventoryItemID);
    if (!inventoryItem) {
      return NextResponse.json({ error: 'Inventory item not found.' }, { status: 404 });
    }

    return NextResponse.json({ inventoryItem }, { status: 200 });
  } catch (error) {
    console.error('Error in inventory item GET:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
};

export const PUT = async (req, { params }) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const inventoryItem = await updateInventoryItem(params.inventoryItemID, body);
    return NextResponse.json({ inventoryItem }, { status: 200 });
  } catch (error) {
    console.error('Error in inventory item PUT:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
};

export const DELETE = async (_req, { params }) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    await deleteInventoryItem(params.inventoryItemID);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in inventory item DELETE:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
};
