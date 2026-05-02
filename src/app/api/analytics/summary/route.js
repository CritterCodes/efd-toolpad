import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { getAnalyticsSummary } from './service';

export const GET = async (request) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30d';
    const includeLegacy = searchParams.get('includeLegacy') === 'true';

    const summary = await getAnalyticsSummary({ dateRange, includeLegacy });
    return NextResponse.json(summary, { status: 200 });
  } catch (error) {
    console.error('Error in analytics summary route:', error);
    return NextResponse.json({ error: error.message || 'Failed to load analytics summary.' }, { status: 500 });
  }
};
