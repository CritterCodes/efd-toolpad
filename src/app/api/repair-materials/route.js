import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { ObjectId } from 'mongodb';
import { db } from '@/lib/database';
import { generateMaterialSku } from '@/utils/skuGenerator';

/**
 * Determine material type from name and category for better SKU generation
 */
function determineMaterialType(name, category) {
  const nameType = name.toLowerCase();
  const categoryType = category.toLowerCase();
  
  // Check for specific material types in the name
  if (nameType.includes('silver')) return 'silver';
  if (nameType.includes('gold')) return 'gold';
  if (nameType.includes('platinum')) return 'platinum';
  if (nameType.includes('copper')) return 'copper';
  if (nameType.includes('brass')) return 'brass';
  if (nameType.includes('steel')) return 'steel';
  
  // Check for tool/supply types
  if (nameType.includes('polish') || nameType.includes('compound')) return 'polishing';
  if (nameType.includes('cut') || nameType.includes('blade') || nameType.includes('saw')) return 'cutting';
  if (nameType.includes('adhesive') || nameType.includes('glue') || nameType.includes('cement')) return 'adhesive';
  if (nameType.includes('solvent') || nameType.includes('cleaner')) return 'solvent';
  if (nameType.includes('lubricant') || nameType.includes('oil')) return 'lubricant';
  
  // Fall back to category-based detection
  if (categoryType.includes('metal')) return 'general';
  if (categoryType.includes('tool')) return 'general';
  if (categoryType.includes('supply')) return 'consumable';
  
  return 'general';
}

/**
 * GET /api/repair-materials
 * Fetch all repair materials with optional filtering
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

/**
 * POST /api/repair-materials
 * Create a new repair material
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
      unitCost,
      unitType,
      compatibleMetals,
      supplier,
      sku,
      description,
      stuller_item_number,
      auto_update_pricing
    } = await request.json();

    // Validation
    if (!displayName || !category) {
      return NextResponse.json({ 
        error: 'Display name and category are required' 
      }, { status: 400 });
    }

    if (unitCost < 0 || unitCost > 100) {
      return NextResponse.json({ 
        error: 'Unit cost must be between 0 and $100' 
      }, { status: 400 });
    }

    // Compatible metals is only required for non-Stuller materials
    // Stuller materials will have compatibility determined from their API data
    if (!stuller_item_number && (!compatibleMetals || compatibleMetals.length === 0)) {
      return NextResponse.json({ 
        error: 'At least one compatible metal must be specified for manual materials' 
      }, { status: 400 });
    }

    await db.connect();

    // Check for duplicate names
    const existingMaterial = await db._instance
      .collection('repairMaterials')
      .findOne({ name: name.toLowerCase() });

    if (existingMaterial) {
      return NextResponse.json({ 
        error: 'A material with this name already exists' 
      }, { status: 400 });
    }

    // Generate SKU if not provided
    const materialType = determineMaterialType(name, category);
    const generatedSku = sku || generateMaterialSku(category, materialType);

    const newMaterial = {
      sku: generatedSku,
      name: name.toLowerCase(),
      displayName: displayName.trim(),
      category: category.toLowerCase(),
      unitCost: parseFloat(unitCost) || 0,
      unitType: unitType || 'application',
      compatibleMetals: compatibleMetals || [],
      supplier: supplier || '',
      description: description || '',
      // Stuller integration fields
      stuller_item_number: stuller_item_number || null,
      auto_update_pricing: auto_update_pricing || false,
      last_price_update: stuller_item_number ? new Date() : null,
      // Standard fields
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.user.email
    };

    const result = await db._instance
      .collection('repairMaterials')
      .insertOne(newMaterial);

    return NextResponse.json({
      success: true,
      message: 'Repair material created successfully',
      materialId: result.insertedId,
      material: newMaterial
    });

  } catch (error) {
    console.error('Create repair material error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
