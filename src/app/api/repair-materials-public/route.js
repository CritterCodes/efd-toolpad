import { NextResponse } from 'next/server';
import { db } from '@/lib/database';

/**
 * GET /api/repair-materials-public
 * Fetch all repair materials (temporary endpoint without auth for testing)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const compatibleMetal = searchParams.get('metal');
    const isActive = searchParams.get('active');

    await db.connect();

    // Build query
    const query = {};
    if (category) query.category = category;
    if (compatibleMetal) query.compatibleMetals = { $in: [compatibleMetal] };
    if (isActive !== null) query.isActive = isActive === 'true';

    const materials = await db._instance
      .collection('repairMaterials')
      .find(query)
      .sort({ category: 1, displayName: 1 })
      .toArray();

    return NextResponse.json({ 
      success: true,
      materials: materials || []
    });

  } catch (error) {
    console.error('Repair materials fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
