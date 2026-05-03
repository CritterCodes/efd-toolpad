import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { consumeInventory } from '@/services/inventoryWorkflow';

export const POST = async (req) => {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const body = await req.json();
    const result = await consumeInventory({
      ...body,
      createdBy: session.user.userID || session.user.email,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error in inventory consume POST:', error);
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
};
