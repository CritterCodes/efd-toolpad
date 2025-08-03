import { NextResponse } from 'next/server';
import { db } from '@/lib/database';

/**
 * GET /api/repair-processes-public
 * Fetch all repair processes (temporary endpoint without auth for testing)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const skillLevel = searchParams.get('skillLevel');
    const isActive = searchParams.get('active');

    await db.connect();

    // Build query
    const query = {};
    if (category) query.category = category;
    if (skillLevel) query.skillLevel = skillLevel;
    if (isActive !== null) query.isActive = isActive === 'true';

    const processes = await db._instance
      .collection('repairProcesses')
      .find(query)
      .sort({ category: 1, displayName: 1 })
      .toArray();

    return NextResponse.json({ 
      success: true,
      processes: processes || []
    });

  } catch (error) {
    console.error('Repair processes fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
