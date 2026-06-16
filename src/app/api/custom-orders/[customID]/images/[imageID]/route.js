import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import CustomOrdersModel from '@/app/api/custom-orders/model';

/** DELETE /api/custom-orders/[customID]/images/[imageID] — remove an image from the order. */
export const DELETE = async (req, { params }) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;

  const { customID, imageID } = await params;
  const updated = await CustomOrdersModel.removeImage(customID, imageID);
  if (!updated) return NextResponse.json({ error: 'Custom order not found.' }, { status: 404 });
  return NextResponse.json(updated, { status: 200 });
};
