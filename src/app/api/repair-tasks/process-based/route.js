import { NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { ObjectId } from 'mongodb';
import { db } from '@/lib/database';
import { generateTaskSku, generateShortCode } from '@/utils/skuGenerator';

/**
 * POST /api/repair-tasks/process-based
 * Create a new repair task using process-based pricing
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      title,
      description,
      category,
      subcategory,
      metalType,
      requiresMetalType,
      processes,        // Array of process selections
      materials,        // Array of material selections
      service,
      workflow,
      constraints,
      display
    } = await request.json();

    // Validation
    if (!title || !category || !processes || processes.length === 0) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, category, processes' 
      }, { status: 400 });
    }

    if (!materials || materials.length === 0) {
      return NextResponse.json({ 
        error: 'At least one material must be specified' 
      }, { status: 400 });
    }

    await db.connect();

    // Get admin settings for pricing calculations
    const adminSettings = await db._instance
      .collection('adminSettings')
      .findOne({});

    if (!adminSettings?.pricing) {
      return NextResponse.json({ 
        error: 'Admin pricing settings not configured' 
      }, { status: 500 });
    }

    // Calculate process-based pricing
    let totalLaborMinutes = 0;
    let totalEquipmentCost = 0;
    const enhancedProcesses = [];

    // Process each selected process
    for (const processSelection of processes) {
      const process = await db._instance
        .collection('repairProcesses')
        .findOne({ _id: new ObjectId(processSelection.processId) });

      if (!process) {
        return NextResponse.json({ 
          error: `Process not found: ${processSelection.processId}` 
        }, { status: 400 });
      }

      // Calculate metal complexity multiplier
      const metalComplexity = process.metalComplexity?.[metalType] || 1.0;
      const quantity = processSelection.quantity || 1;
      
      const calculatedLaborMinutes = process.laborMinutes * metalComplexity * quantity;
      const calculatedEquipmentCost = process.equipmentCost * quantity;

      totalLaborMinutes += calculatedLaborMinutes;
      totalEquipmentCost += calculatedEquipmentCost;

      enhancedProcesses.push({
        processId: new ObjectId(processSelection.processId),
        processName: process.name,
        displayName: process.displayName,
        metalType: metalType,
        quantity: quantity,
        baseLaborMinutes: process.laborMinutes,
        metalComplexity: metalComplexity,
        calculatedLaborMinutes: calculatedLaborMinutes,
        baseEquipmentCost: process.equipmentCost,
        calculatedEquipmentCost: calculatedEquipmentCost,
        skillLevel: process.skillLevel,
        riskLevel: process.riskLevel
      });
    }

    // Calculate materials cost
    let totalMaterialCost = 0;
    const enhancedMaterials = [];

    for (const materialSelection of materials) {
      const material = await db._instance
        .collection('repairMaterials')
        .findOne({ _id: new ObjectId(materialSelection.materialId) });

      if (!material) {
        return NextResponse.json({ 
          error: `Material not found: ${materialSelection.materialId}` 
        }, { status: 400 });
      }

      // Check metal compatibility
      if (!material.compatibleMetals.includes(metalType)) {
        return NextResponse.json({ 
          error: `Material "${material.displayName}" is not compatible with ${metalType}` 
        }, { status: 400 });
      }

      const quantity = materialSelection.quantity || 1;
      const totalCost = material.unitCost * quantity;
      totalMaterialCost += totalCost;

      enhancedMaterials.push({
        materialId: new ObjectId(materialSelection.materialId),
        materialName: material.name,
        displayName: material.displayName,
        quantity: quantity,
        unitCost: material.unitCost,
        totalCost: totalCost,
        unitType: material.unitType,
        category: material.category
      });
    }

    // Apply material markup from admin settings
    const markedUpMaterialCost = totalMaterialCost * (adminSettings.pricing.materialMarkup || 1.5);

    // Calculate final pricing using new process-based formula
    const laborRate = adminSettings.pricing.wage / 60; // Convert hourly wage to per-minute
    const processLaborCost = totalLaborMinutes * laborRate;
    const baseCost = processLaborCost + totalEquipmentCost + markedUpMaterialCost;
    
    const businessMultiplier = (adminSettings.pricing.administrativeFee + 
                               adminSettings.pricing.businessFee + 
                               adminSettings.pricing.consumablesFee + 1);
    
    const retailPrice = Math.round(baseCost * businessMultiplier * 100) / 100;
    const wholesalePrice = Math.round(retailPrice * 0.5 * 100) / 100;

    // Generate shortCode and SKU following specification
    const shortCode = generateShortCode(category, metalType, karat);
    const sku = generateTaskSku(category, shortCode);

    // Create new process-based repair task
    const newTask = {
      // Core Identification
      sku: sku,
      shortCode: shortCode,
      title: title.trim(),
      description: description || '',
      category: category.toLowerCase(),
      subcategory: subcategory || '',

      // Metal Type Integration
      metalType: metalType,
      requiresMetalType: requiresMetalType !== false,

      // Process-Based Pricing (NEW)
      processes: enhancedProcesses,
      materials: enhancedMaterials,
      
      // Calculated Pricing
      pricing: {
        // Process breakdown
        totalLaborMinutes: Math.round(totalLaborMinutes * 100) / 100,
        totalEquipmentCost: Math.round(totalEquipmentCost * 100) / 100,
        totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
        markedUpMaterialCost: Math.round(markedUpMaterialCost * 100) / 100,
        
        // Final pricing
        baseCost: Math.round(baseCost * 100) / 100,
        retailPrice: retailPrice,
        wholesalePrice: wholesalePrice,
        
        // Settings used
        materialMarkup: adminSettings.pricing.materialMarkup || 1.5,
        businessMultiplier: Math.round(businessMultiplier * 100) / 100,
        laborRatePerMinute: Math.round(laborRate * 100) / 100,
        calculatedAt: new Date()
      },

      // Legacy compatibility (for existing systems)
      laborHours: Math.round((totalLaborMinutes / 60) * 100) / 100,
      materialCost: totalMaterialCost,
      basePrice: retailPrice, // Backwards compatibility

      // Service Details
      service: {
        estimatedDays: service?.estimatedDays || 3,
        rushDays: service?.rushDays || 1,
        rushMultiplier: service?.rushMultiplier || 1.5,
        requiresApproval: service?.requiresApproval !== false,
        requiresInspection: service?.requiresInspection !== false,
        canBeBundled: service?.canBeBundled !== false,
        skillLevel: getMostComplexSkillLevel(enhancedProcesses),
        riskLevel: getHighestRiskLevel(enhancedProcesses)
      },

      // Workflow
      workflow: {
        departments: workflow?.departments || ['workshop'],
        equipmentNeeded: getUniqueEquipment(enhancedProcesses),
        qualityChecks: workflow?.qualityChecks || ['measurement', 'finish'],
        safetyRequirements: getUniqueSafetyRequirements(enhancedProcesses)
      },

      // Constraints
      constraints: {
        minQuantity: constraints?.minQuantity || 1,
        maxQuantity: constraints?.maxQuantity || 10,
        ...constraints
      },

      // Display & Status
      display: {
        isActive: display?.isActive !== false,
        isFeatured: display?.isFeatured === true,
        sortOrder: display?.sortOrder || 0,
        icon: getCategoryIcon(category),
        color: getCategoryColor(category)
      },

      // Analytics
      analytics: {
        timesUsed: 0,
        averageCompletionTime: null,
        customerSatisfactionScore: null,
        profitMargin: null
      },

      // Shopify Integration (maintained for orders)
      shopify: {
        productId: null,
        variantId: null,
        needsSync: false,
        lastSyncedAt: null,
        shopifyPrice: retailPrice
      },

      // Metadata
      pricingVersion: '3.0', // Process-based pricing
      createdAt: new Date(),
      updatedAt: new Date(),
      version: 1,
      isArchived: false,
      createdBy: session.user.email
    };

    // Insert the repair task
    const result = await db._instance
      .collection('repairTasks')
      .insertOne(newTask);

    return NextResponse.json({
      success: true,
      message: 'Process-based repair task created successfully',
      taskId: result.insertedId,
      task: newTask
    });

  } catch (error) {
    console.error('Create process-based repair task error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper functions
function getMostComplexSkillLevel(processes) {
  const skillLevels = { 'basic': 1, 'standard': 2, 'advanced': 3, 'expert': 4 };
  let highestLevel = 0;
  let highestLevelName = 'basic';
  
  processes.forEach(process => {
    const level = skillLevels[process.skillLevel] || 1;
    if (level > highestLevel) {
      highestLevel = level;
      highestLevelName = process.skillLevel;
    }
  });
  
  return highestLevelName;
}

function getHighestRiskLevel(processes) {
  const riskLevels = { 'low': 1, 'medium': 2, 'high': 3, 'critical': 4 };
  let highestRisk = 0;
  let highestRiskName = 'low';
  
  processes.forEach(process => {
    const risk = riskLevels[process.riskLevel] || 1;
    if (risk > highestRisk) {
      highestRisk = risk;
      highestRiskName = process.riskLevel;
    }
  });
  
  return highestRiskName;
}

function getUniqueEquipment(processes) {
  // This would need to be enhanced when we add equipment tracking to processes
  return ['workshop_tools'];
}

function getUniqueSafetyRequirements(processes) {
  // This would need to be enhanced when we add safety requirements to processes
  return ['safety_glasses'];
}

function getCategoryIcon(category) {
  const icons = {
    'sizing': 'resize',
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

function getCategoryColor(category) {
  const colors = {
    'sizing': '#4A90E2',
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
