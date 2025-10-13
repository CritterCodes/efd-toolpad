import { NextResponse } from 'next/server';
import { db } from '../../../../lib/database';
import { ObjectId } from 'mongodb';

/**
 * Find processes that use specific materials
 */
export async function POST(request) {
  try {
    const { materialIds } = await request.json();
    
    if (!materialIds || !Array.isArray(materialIds)) {
      return NextResponse.json({ error: 'Material IDs array required' }, { status: 400 });
    }
    
    await db.connect();
    const processesCollection = db.collection('processes');
    
    // Convert string IDs to ObjectIds
    const objectIds = materialIds.map(id => new ObjectId(id));
    
    // Find processes that have any of these materials in their materials array
    const processes = await processesCollection.find({
      'materials.materialId': { $in: objectIds },
      isActive: { $ne: false }
    }).toArray();
    
    console.log(`🔍 Found ${processes.length} processes using materials:`, materialIds);
    
    return NextResponse.json({
      success: true,
      processes: processes
    });
    
  } catch (error) {
    console.error('❌ Error finding processes by materials:', error);
    return NextResponse.json(
      { error: 'Failed to find processes using materials' },
      { status: 500 }
    );
  }
}
