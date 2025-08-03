import { NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { db } from '@/lib/database';
import { ObjectId } from 'mongodb';

/**
 * GET /api/repair-tasks/crud/[taskId]
 * Fetch a single repair task by ID
 */
export async function GET(request, { params }) {
  try {
    const session = await auth();
    
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = params;

    if (!ObjectId.isValid(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    await db.connect();
    
    const task = await db._instance.collection('repairTasks').findOne({ 
      _id: new ObjectId(taskId) 
    });

    if (!task) {
      return NextResponse.json({ error: 'Repair task not found' }, { status: 404 });
    }

    return NextResponse.json({ task });

  } catch (error) {
    console.error('Repair task fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/repair-tasks/crud/[taskId]
 * Update an existing repair task
 */
export async function PUT(request, { params }) {
  try {
    const session = await auth();
    
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId } = params;

    if (!ObjectId.isValid(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
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

    // Check if task exists
    const existingTask = await db._instance.collection('repairTasks').findOne({ 
      _id: new ObjectId(taskId) 
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Repair task not found' }, { status: 404 });
    }

    // Get admin settings for price calculation
    const adminSettings = await db._instance.collection('adminSettings').findOne({ 
      _id: 'repair_task_admin_settings' 
    });

    if (!adminSettings) {
      return NextResponse.json({ error: 'Admin settings not found' }, { status: 500 });
    }

    // Calculate new base price
    const basePrice = calculateBasePrice(laborHours, materialCost, adminSettings.pricing);

    // Build update object
    const updateFields = {
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
        ...existingTask.service,
        ...(service && {
          estimatedDays: service.estimatedDays || existingTask.service?.estimatedDays || 3,
          rushDays: service.rushDays || existingTask.service?.rushDays || 1,
          rushMultiplier: service.rushMultiplier || existingTask.service?.rushMultiplier || 1.5,
          requiresApproval: service.requiresApproval !== undefined ? service.requiresApproval : existingTask.service?.requiresApproval || false,
          requiresInspection: service.requiresInspection !== undefined ? service.requiresInspection : existingTask.service?.requiresInspection || true,
          canBeBundled: service.canBeBundled !== undefined ? service.canBeBundled : existingTask.service?.canBeBundled || true,
          skillLevel: service.skillLevel || existingTask.service?.skillLevel || 'standard',
          riskLevel: service.riskLevel || existingTask.service?.riskLevel || 'low'
        })
      },
      
      // Workflow
      workflow: {
        ...existingTask.workflow,
        ...(workflow && {
          departments: workflow.departments || existingTask.workflow?.departments || ['workshop'],
          equipmentNeeded: workflow.equipmentNeeded || existingTask.workflow?.equipmentNeeded || [],
          qualityChecks: workflow.qualityChecks || existingTask.workflow?.qualityChecks || ['measurement', 'fit', 'finish'],
          safetyRequirements: workflow.safetyRequirements || existingTask.workflow?.safetyRequirements || ['protective_gear']
        })
      },
      
      // Constraints
      constraints: {
        ...existingTask.constraints,
        ...(constraints && {
          minQuantity: constraints.minQuantity || existingTask.constraints?.minQuantity || 1,
          maxQuantity: constraints.maxQuantity || existingTask.constraints?.maxQuantity || 10,
          sizeRange: constraints.sizeRange || existingTask.constraints?.sizeRange || null,
          weightLimits: constraints.weightLimits || existingTask.constraints?.weightLimits || { minGrams: null, maxGrams: null }
        })
      },
      
      // Display
      display: {
        ...existingTask.display,
        ...(display && {
          isActive: display.isActive !== undefined ? display.isActive : existingTask.display?.isActive !== false,
          isFeatured: display.isFeatured !== undefined ? display.isFeatured : existingTask.display?.isFeatured || false,
          sortOrder: display.sortOrder || existingTask.display?.sortOrder || 100,
          tags: display.tags || existingTask.display?.tags || [],
          icon: display.icon || existingTask.display?.icon || getCategoryIcon(category),
          color: display.color || existingTask.display?.color || getCategoryColor(category),
          thumbnailUrl: display.thumbnailUrl || existingTask.display?.thumbnailUrl || null
        })
      },
      
      // Update pricing components
      'pricing.calculatedAt': new Date(),
      'pricing.formula': 'v2.0_business_formula',
      'pricing.components': {
        laborHours,
        laborCost: laborHours * adminSettings.pricing.wage,
        materialCost,
        materialMarkup: materialCost * 1.5,
        businessMultiplier: adminSettings.pricing.administrativeFee + 
                           adminSettings.pricing.businessFee + 
                           adminSettings.pricing.consumablesFee + 1,
        wage: adminSettings.pricing.wage,
        fees: {
          administrative: adminSettings.pricing.administrativeFee,
          business: adminSettings.pricing.businessFee,
          consumables: adminSettings.pricing.consumablesFee
        }
      },
      
      // Update metadata
      updatedAt: new Date(),
      lastModifiedBy: session.user.email
    };

    // If category changed, update SKU and shortCode
    if (category !== existingTask.category || metalType !== existingTask.metalType) {
      const shortCode = await generateUniqueShortCode(category, metalType, taskId);
      const sku = `RT-${category.toUpperCase()}-${shortCode}`;
      
      updateFields.sku = sku;
      updateFields.shortCode = shortCode;
      updateFields['shopify.needsSync'] = true; // Flag for Shopify resync
    }

    const result = await db._instance.collection('repairTasks').updateOne(
      { _id: new ObjectId(taskId) },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Repair task not found' }, { status: 404 });
    }

    // Return updated task
    const updatedTask = await db._instance.collection('repairTasks').findOne({ 
      _id: new ObjectId(taskId) 
    });

    return NextResponse.json({
      success: true,
      message: 'Repair task updated successfully',
      task: updatedTask
    });

  } catch (error) {
    console.error('Update repair task error:', error);
    return NextResponse.json({ 
      error: 'Failed to update repair task' 
    }, { status: 500 });
  }
}

/**
 * DELETE - Archive or permanently delete a repair task
 * Query parameters:
 * - hard=true: Permanently delete the task
 * - hard=false (default): Archive the task (soft delete)
 */
export async function DELETE(request, { params }) {
  try {
    const { taskId } = params;
    const url = new URL(request.url);
    const hardDelete = url.searchParams.get('hard') === 'true';

    // Validate session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate taskId
    if (!taskId || !ObjectId.isValid(taskId)) {
      return NextResponse.json({ error: 'Invalid task ID' }, { status: 400 });
    }

    await db.connect();

    // Check if task exists
    const existingTask = await db._instance.collection('repairTasks').findOne({ 
      _id: new ObjectId(taskId) 
    });

    if (!existingTask) {
      return NextResponse.json({ error: 'Repair task not found' }, { status: 404 });
    }

    if (hardDelete) {
      // Hard delete - permanently remove from database
      const result = await db._instance.collection('repairTasks').deleteOne({ 
        _id: new ObjectId(taskId) 
      });

      if (result.deletedCount === 0) {
        return NextResponse.json({ error: 'Failed to delete repair task' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Repair task permanently deleted',
        taskId,
        title: existingTask.title 
      });
    } else {
      // Soft delete - archive the task
      const result = await db._instance.collection('repairTasks').updateOne(
        { _id: new ObjectId(taskId) },
        { 
          $set: { 
            isArchived: true,
            archivedAt: new Date(),
            archivedBy: session.user.email,
            'display.isActive': false
          } 
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'Repair task not found' }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Repair task archived',
        taskId,
        title: existingTask.title 
      });
    }

  } catch (error) {
    console.error('Delete repair task error:', error);
    return NextResponse.json({ 
      error: 'Failed to delete repair task' 
    }, { status: 500 });
  }
}

/**
 * Generate unique shortCode for repair task (excluding current task)
 */
async function generateUniqueShortCode(category, metalType, excludeTaskId = null) {
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
    
    const query = { shortCode };
    if (excludeTaskId) {
      query._id = { $ne: new ObjectId(excludeTaskId) };
    }
    
    const existing = await db._instance.collection('repairTasks').findOne(query);
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
  const materialMarkup = materialCost * 1.5;
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
