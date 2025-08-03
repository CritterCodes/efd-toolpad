import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { ObjectId } from 'mongodb';
import { db } from '@/lib/database';
import { generateProcessSku } from '@/utils/skuGenerator';

/**
 * GET /api/repair-processes
 * Fetch all repair processes with optional filtering
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

/**
 * POST /api/repair-processes
 * Create a new repair process
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      name,
      displayName,
      category,
      laborMinutes,
      skillLevel,
      equipmentCost,
      metalComplexity,
      riskLevel,
      description,
      safetyRequirements
    } = await request.json();

    // Validation
    if (!name || !displayName || !category) {
      return NextResponse.json({ 
        error: 'Name, display name, and category are required' 
      }, { status: 400 });
    }

    if (laborMinutes < 0 || laborMinutes > 480) { // Max 8 hours
      return NextResponse.json({ 
        error: 'Labor minutes must be between 0 and 480' 
      }, { status: 400 });
    }

    if (equipmentCost < 0 || equipmentCost > 50) {
      return NextResponse.json({ 
        error: 'Equipment cost must be between 0 and $50' 
      }, { status: 400 });
    }

    await db.connect();

    // Check for duplicate names
    const existingProcess = await db._instance
      .collection('repairProcesses')
      .findOne({ name: name.toLowerCase() });

    if (existingProcess) {
      return NextResponse.json({ 
        error: 'A process with this name already exists' 
      }, { status: 400 });
    }

    // Generate unique SKU for the process
    const sku = generateProcessSku(category, skillLevel);

    const newProcess = {
      sku: sku,
      name: name.toLowerCase(),
      displayName: displayName.trim(),
      category: category.toLowerCase(),
      laborMinutes: parseFloat(laborMinutes) || 0,
      skillLevel: skillLevel || 'standard',
      equipmentCost: parseFloat(equipmentCost) || 0,
      metalComplexity: metalComplexity || {
        silver: 1.0,
        gold: 1.2,
        platinum: 1.8,
        mixed: 1.1
      },
      riskLevel: riskLevel || 'low',
      description: description || '',
      safetyRequirements: safetyRequirements || [],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.user.email
    };

    const result = await db._instance
      .collection('repairProcesses')
      .insertOne(newProcess);

    return NextResponse.json({
      success: true,
      message: 'Repair process created successfully',
      processId: result.insertedId,
      process: newProcess
    });

  } catch (error) {
    console.error('Create repair process error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
