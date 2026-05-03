import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import StullerOrdersModel from '@/app/api/stullerOrders/model';

export const GET = async (_req, { params }) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const order = await StullerOrdersModel.findByID(params.orderId);
    if (!order) {
      return NextResponse.json({ error: 'Stuller order not found.' }, { status: 404 });
    }

    return NextResponse.json({ order }, { status: 200 });
  } catch (error) {
    console.error('Error in Stuller order detail GET:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
};
