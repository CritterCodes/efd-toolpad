import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/lib/database';

/**
 * GET /api/repair-tasks/crud
 * Fetch repair tasks with filtering, sorting, and pagination
 */
export async function GET(request) {
  try {
    const session = await auth();
    
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Query parameters
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 12;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const metalType = searchParams.get('metalType') || '';
    const isActive = searchParams.get('isActive');
    const sortBy = searchParams.get('sortBy') || 'title';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    await db.connect();
    
    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { shortCode: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    if (metalType && metalType !== 'all') {
      query.metalType = metalType;
    }
    
    if (isActive !== null && isActive !== '') {
      query['display.isActive'] = isActive === 'true';
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    
    const [tasks, totalCount] = await Promise.all([
      db._instance.collection('repairTasks')
        .find(query)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .toArray(),
      db._instance.collection('repairTasks').countDocuments(query)
    ]);

    // Calculate statistics
    const totalTasks = await db._instance.collection('repairTasks').countDocuments();
    const activeTasks = await db._instance.collection('repairTasks').countDocuments({ 'display.isActive': true });
    const categories = await db._instance.collection('repairTasks').distinct('category');

    return NextResponse.json({
      tasks,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page < Math.ceil(totalCount / limit),
        hasPrevPage: page > 1
      },
      statistics: {
        totalTasks,
        activeTasks,
        inactiveTasks: totalTasks - activeTasks,
        categories: categories.length
      },
      filters: {
        availableCategories: categories,
        availableMetalTypes: ['gold', 'silver', 'platinum', 'mixed']
      }
    });

  } catch (error) {
    console.error('Repair tasks fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/repair-tasks/crud
 * Create a new repair task
 */
export async function POST(request) {
  try {
    const session = await auth();
    
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      subcategory,
      metalType,
      requiresMetalType,
      laborHours,
      materialCost,
      service,
      workflow,
      constraints,
      display
    } = body;

    // Validation
    if (!title || !category || laborHours === undefined || materialCost === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, category, laborHours, materialCost' 
      }, { status: 400 });
    }

    if (laborHours < 0 || laborHours > 8) {
      return NextResponse.json({ 
        error: 'Labor hours must be between 0 and 8' 
      }, { status: 400 });
    }

    if (materialCost < 0 || materialCost > 500) {
      return NextResponse.json({ 
        error: 'Material cost must be between 0 and 500' 
      }, { status: 400 });
    }

    await db.connect();

    // Generate unique shortCode
    const shortCode = await generateUniqueShortCode(category, metalType);
    const sku = `RT-${category.toUpperCase()}-${shortCode}`;

    // Get admin settings for price calculation
    const adminSettings = await db._instance.collection('adminSettings').findOne({ 
      _id: 'repair_task_admin_settings' 
    });

    if (!adminSettings) {
      return NextResponse.json({ error: 'Admin settings not found' }, { status: 500 });
    }

    // Calculate base price
    const basePrice = calculateBasePrice(laborHours, materialCost, adminSettings.pricing);

    // Create new repair task
    const newTask = {
      sku,
      shortCode,
      title: title.trim(),
      description: description?.trim() || '',
      category,
      subcategory: subcategory || `${category}_general`,
      metalType: metalType || null,
      requiresMetalType: requiresMetalType || false,
      
      // Core pricing
      laborHours,
      materialCost,
      basePrice,
      
      // Service details
      service: {
        estimatedDays: service?.estimatedDays || 3,
        rushDays: service?.rushDays || 1,
        rushMultiplier: service?.rushMultiplier || 1.5,
        requiresApproval: service?.requiresApproval || false,
        requiresInspection: service?.requiresInspection || true,
        canBeBundled: service?.canBeBundled || true,
        skillLevel: service?.skillLevel || 'standard',
        riskLevel: service?.riskLevel || 'low'
      },
      
      // Workflow
      workflow: {
        departments: workflow?.departments || ['workshop'],
        equipmentNeeded: workflow?.equipmentNeeded || [],
        qualityChecks: workflow?.qualityChecks || ['measurement', 'fit', 'finish'],
        safetyRequirements: workflow?.safetyRequirements || ['protective_gear']
      },
      
      // Constraints
      constraints: {
        minQuantity: constraints?.minQuantity || 1,
        maxQuantity: constraints?.maxQuantity || 10,
        sizeRange: constraints?.sizeRange || null,
        weightLimits: constraints?.weightLimits || { minGrams: null, maxGrams: null }
      },
      
      // Display
      display: {
        isActive: display?.isActive !== false,
        isFeatured: display?.isFeatured || false,
        sortOrder: display?.sortOrder || 100,
        tags: display?.tags || [],
        icon: display?.icon || getCategoryIcon(category),
        color: display?.color || getCategoryColor(category),
        thumbnailUrl: display?.thumbnailUrl || null
      },
      
      // Shopify integration (empty for new tasks)
      shopify: {
        productId: null,
        variantId: null,
        needsSync: true,
        lastSyncedAt: null,
        shopifyPrice: 0
      },
      
      // Analytics
      analytics: {
        originalPrice: null,
        timesUsed: 0,
        averageCompletionTime: null,
        customerSatisfactionScore: null,
        lastUsed: null,
        seasonalDemand: {},
        profitMargin: null
      },
      
      // Pricing components
      pricing: {
        calculatedAt: new Date(),
        formula: 'v2.0_business_formula',
        components: {
          laborHours,
          laborCost: laborHours * adminSettings.pricing.wage,
          materialCost,
          materialMarkup: materialCost * (adminSettings.pricing.materialMarkup || 1.5),
          businessMultiplier: adminSettings.pricing.administrativeFee + 
                             adminSettings.pricing.businessFee + 
                             adminSettings.pricing.consumablesFee + 1,
          wage: adminSettings.pricing.wage,
          fees: {
            administrative: adminSettings.pricing.administrativeFee,
            business: adminSettings.pricing.businessFee,
            consumables: adminSettings.pricing.consumablesFee
          }
        }
      },
      
      // Metadata
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.user.email,
      lastModifiedBy: session.user.email,
      version: 2,
      isArchived: false,
      archivedAt: null,
      archivedReason: null
    };

    const result = await db._instance.collection('repairTasks').insertOne(newTask);
    
    if (!result.insertedId) {
      return NextResponse.json({ error: 'Failed to create repair task' }, { status: 500 });
    }

    // Return the created task
    const createdTask = await db._instance.collection('repairTasks').findOne({ _id: result.insertedId });

    return NextResponse.json({
      success: true,
      message: 'Repair task created successfully',
      task: createdTask
    }, { status: 201 });

  } catch (error) {
    console.error('Repair task creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Generate unique shortCode for repair task
 */
async function generateUniqueShortCode(category, metalType) {
  const categoryMap = {
    'shank': '0',
    'prongs': '1',
    'stone_setting': '2',
    'engraving': '3',
    'chains': '4',
    'bracelet': '5',
    'watch': '6',
    'misc': '7'
  };

  const metalMap = {
    'gold': '2',
    'silver': '1',
    'platinum': '3',
    'mixed': '4'
  };

  const categoryCode = categoryMap[category] || '7';
  const metalCode = metalMap[metalType] || '0';
  
  // Find next available task number
  let taskNumber = 1;
  let shortCode;
  
  do {
    const taskCode = taskNumber.toString().padStart(2, '0');
    shortCode = `${categoryCode}${metalCode}${taskCode}1`;
    
    const existing = await db._instance.collection('repairTasks').findOne({ shortCode });
    if (!existing) break;
    
    taskNumber++;
  } while (taskNumber < 100);

  return shortCode;
}

/**
 * Calculate base price using business formula
 */
function calculateBasePrice(laborHours, materialCost, pricingSettings) {
  const laborCost = laborHours * pricingSettings.wage;
  const materialMarkup = materialCost * (pricingSettings.materialMarkup || 1.5);
  const subtotal = laborCost + materialMarkup;
  
  const businessMultiplier = pricingSettings.administrativeFee + 
                           pricingSettings.businessFee + 
                           pricingSettings.consumablesFee + 1;
  
  return Math.round(subtotal * businessMultiplier * 100) / 100;
}

/**
 * Get category icon
 */
function getCategoryIcon(category) {
  const icons = {
    'shank': 'resize',
    'prongs': 'grip-vertical',
    'stone_setting': 'gem',
    'engraving': 'edit',
    'chains': 'link',
    'bracelet': 'circle',
    'watch': 'clock',
    'misc': 'tool'
  };
  return icons[category] || 'tool';
}

/**
 * Get category color
 */
function getCategoryColor(category) {
  const colors = {
    'shank': '#4A90E2',
    'prongs': '#7ED321',
    'stone_setting': '#9013FE',
    'engraving': '#FF6900',
    'chains': '#ABB8C3',
    'bracelet': '#F5A623',
    'watch': '#BD10E0',
    'misc': '#50E3C2'
  };
  return colors[category] || '#ABB8C3';
}
