import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { receiveInventory } from '@/services/inventoryWorkflow';

export const POST = async (req) => {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const result = await receiveInventory({
      ...body,
      createdBy: session.user.userID || session.user.email,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error in inventory receive POST:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
};
