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
      displayName,
      category,
      laborHours,
      skillLevel,
      metalType,
      karat,
      metalComplexityMultiplier,
      description,
      materials
    } = await request.json();

    // Validation
    if (!displayName || !category) {
      return NextResponse.json({ 
        error: 'Display name and category are required' 
      }, { status: 400 });
    }

    if (laborHours < 0 || laborHours > 8) { // Max 8 hours
      return NextResponse.json({ 
        error: 'Labor hours must be between 0 and 8' 
      }, { status: 400 });
    }

    await db.connect();

    // Get admin settings for pricing calculation
    const adminSettings = await db._instance
      .collection('adminSettings')
      .findOne({});

    if (!adminSettings?.pricing) {
      return NextResponse.json({ 
        error: 'Admin pricing settings not configured' 
      }, { status: 500 });
    }

    // Check for duplicate display names
    const existingProcess = await db._instance
      .collection('repairProcesses')
      .findOne({ displayName: displayName.trim() });

    if (existingProcess) {
      return NextResponse.json({ 
        error: 'A process with this display name already exists' 
      }, { status: 400 });
    }

    // Generate unique SKU for the process
    const sku = generateProcessSku(category, skillLevel);

    // Calculate process pricing
    const laborHoursNum = parseFloat(laborHours) || 0;
    const baseWage = adminSettings.pricing.wage || 30;
    const skillMultipliers = { basic: 0.75, standard: 1.0, advanced: 1.25, expert: 1.5 };
    const hourlyRate = baseWage * (skillMultipliers[skillLevel] || 1.0);
    const laborCost = laborHoursNum * hourlyRate;

    // Calculate materials cost
    const materialMarkup = adminSettings.pricing.materialMarkup || 1.3;
    const baseMaterialsCost = (materials || []).reduce((total, material) => {
      return total + (material.estimatedCost || 0);
    }, 0);
    const materialsCost = baseMaterialsCost * materialMarkup;

    // Apply metal complexity multiplier
    const multiplier = parseFloat(metalComplexityMultiplier) || 1.0;
    const totalCost = (laborCost + materialsCost) * multiplier;

    const processpricing = {
      laborCost: Math.round(laborCost * 100) / 100,
      baseMaterialsCost: Math.round(baseMaterialsCost * 100) / 100,
      materialsCost: Math.round(materialsCost * 100) / 100,
      materialMarkup: materialMarkup,
      totalCost: Math.round(totalCost * 100) / 100,
      hourlyRate: hourlyRate,
      calculatedAt: new Date()
    };

    const newProcess = {
      sku: sku,
      displayName: displayName.trim(),
      category: category.toLowerCase(),
      laborHours: laborHoursNum,
      skillLevel: skillLevel || 'standard',
      metalType: metalType || '',
      karat: karat || '',
      metalComplexityMultiplier: multiplier,
      description: description || '',
      materials: materials || [],
      pricing: processpricing,
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

/**
 * PUT /api/repair-processes?id=<processId>
 * Update an existing repair process
 */
export async function PUT(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const processId = searchParams.get('id');

    if (!processId) {
      return NextResponse.json({ error: 'Process ID is required' }, { status: 400 });
    }

    const {
      displayName,
      category,
      laborHours,
      skillLevel,
      metalType,
      karat,
      metalComplexityMultiplier,
      description,
      materials
    } = await request.json();

    // Validation
    if (!displayName || !category) {
      return NextResponse.json({ 
        error: 'Display name and category are required' 
      }, { status: 400 });
    }

    if (laborHours < 0 || laborHours > 8) {
      return NextResponse.json({ 
        error: 'Labor hours must be between 0 and 8' 
      }, { status: 400 });
    }

    await db.connect();

    // Get admin settings for pricing calculation
    const adminSettings = await db._instance
      .collection('adminSettings')
      .findOne({});

    if (!adminSettings?.pricing) {
      return NextResponse.json({ 
        error: 'Admin pricing settings not configured' 
      }, { status: 500 });
    }

    // Check if process exists
    const existingProcess = await db._instance
      .collection('repairProcesses')
      .findOne({ _id: new ObjectId(processId) });

    if (!existingProcess) {
      return NextResponse.json({ error: 'Process not found' }, { status: 404 });
    }

    // Check for duplicate display names (excluding current process)
    const duplicateProcess = await db._instance
      .collection('repairProcesses')
      .findOne({ 
        displayName: displayName.trim(), 
        _id: { $ne: new ObjectId(processId) } 
      });

    if (duplicateProcess) {
      return NextResponse.json({ 
        error: 'A process with this display name already exists' 
      }, { status: 400 });
    }

    // Calculate process pricing for update
    const laborHoursNum = parseFloat(laborHours) || 0;
    const baseWage = adminSettings.pricing.wage || 30;
    const skillMultipliers = { basic: 0.75, standard: 1.0, advanced: 1.25, expert: 1.5 };
    const hourlyRate = baseWage * (skillMultipliers[skillLevel] || 1.0);
    const laborCost = laborHoursNum * hourlyRate;

    // Calculate materials cost
    const materialMarkup = adminSettings.pricing.materialMarkup || 1.3;
    const baseMaterialsCost = (materials || []).reduce((total, material) => {
      return total + (material.estimatedCost || 0);
    }, 0);
    const materialsCost = baseMaterialsCost * materialMarkup;

    // Apply metal complexity multiplier
    const multiplier = parseFloat(metalComplexityMultiplier) || 1.0;
    const totalCost = (laborCost + materialsCost) * multiplier;

    const updatePricing = {
      laborCost: Math.round(laborCost * 100) / 100,
      baseMaterialsCost: Math.round(baseMaterialsCost * 100) / 100,
      materialsCost: Math.round(materialsCost * 100) / 100,
      materialMarkup: materialMarkup,
      totalCost: Math.round(totalCost * 100) / 100,
      hourlyRate: hourlyRate,
      calculatedAt: new Date()
    };

    const updatedProcess = {
      displayName: displayName.trim(),
      category: category.toLowerCase(),
      laborHours: laborHoursNum,
      skillLevel: skillLevel || 'standard',
      metalType: metalType || '',
      karat: karat || '',
      metalComplexityMultiplier: multiplier,
      description: description || '',
      materials: materials || [],
      pricing: updatePricing,
      updatedAt: new Date(),
      updatedBy: session.user.email
    };

    const result = await db._instance
      .collection('repairProcesses')
      .updateOne(
        { _id: new ObjectId(processId) },
        { $set: updatedProcess }
      );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Process not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Process updated successfully'
    });

  } catch (error) {
    console.error('Update repair process error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/repair-processes?id=<processId>
 * Delete a repair process
 */
export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const processId = searchParams.get('id');

    if (!processId) {
      return NextResponse.json({ error: 'Process ID is required' }, { status: 400 });
    }

    await db.connect();

    const result = await db._instance
      .collection('repairProcesses')
      .deleteOne({ _id: new ObjectId(processId) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Process not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Process deleted successfully'
    });

  } catch (error) {
    console.error('Delete repair process error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
