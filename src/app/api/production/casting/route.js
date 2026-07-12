import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { listCastingQueue } from '@/services/production/casting';

export const GET = async () => {
  const { errorResponse } = await requireRole(['admin', 'dev']);
  if (errorResponse) return errorResponse;
  return NextResponse.json(await listCastingQueue());
};
