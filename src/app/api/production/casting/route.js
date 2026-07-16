import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { listCastingQueue } from '@/services/casting/castingService';

/** GET /api/production/casting — all pieces with casting=needs_ordering (the casting board queue). */
export const GET = async (req) => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  const queue = await listCastingQueue();
  return NextResponse.json(queue, { status: 200 });
};
