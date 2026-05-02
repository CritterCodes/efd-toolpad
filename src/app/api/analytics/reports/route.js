import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { getAnalyticsReports } from './service';

export const GET = async (request) => {
  try {
    const { errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || 'last_month';
    const reports = await getAnalyticsReports({ dateRange });
    return NextResponse.json(reports, { status: 200 });
  } catch (error) {
    console.error('Error in analytics reports route:', error);
    return NextResponse.json({ error: error.message || 'Failed to load analytics reports.' }, { status: 500 });
  }
};
