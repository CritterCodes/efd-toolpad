import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { listAssignableArtisans } from '@/services/customs/customAssignment';

/** GET /api/custom-orders/assignable-artisans — artisans eligible for assignment (+ CAD fee). */
export const GET = async () => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const artisans = await listAssignableArtisans();
  return NextResponse.json(artisans, { status: 200 });
};
