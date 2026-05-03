import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import StullerOrdersModel from '@/app/api/stullerOrders/model';
import { syncStullerOrdersByPurchaseOrderNumbers } from '@/services/stuller/stullerSync';

export const GET = async (req) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const purchaseOrderNumber = searchParams.get('purchaseOrderNumber');
    const filter = purchaseOrderNumber ? { purchaseOrderNumber } : {};
    const orders = await StullerOrdersModel.list(filter);
    return NextResponse.json({ orders }, { status: 200 });
  } catch (error) {
    console.error('Error in Stuller orders GET:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
};

export const POST = async (req) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const result = await syncStullerOrdersByPurchaseOrderNumbers(body.purchaseOrderNumbers || body.purchaseOrderNumber || []);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Error in Stuller orders POST:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
};
