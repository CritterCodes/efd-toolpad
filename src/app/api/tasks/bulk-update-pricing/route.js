import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import { ObjectId } from 'mongodb';

/**
 * Bulk update task pricing based on new admin settings
 */
export async function POST(request) {
  try {
    const { adminSettings } = await request.json();
    
    if (!adminSettings) {
      return NextResponse.json({ error: 'Admin settings required' }, { status: 400 });
    }
    
    await db.connect();
    const tasksCollection = db._instance.collection('tasks');
    const processesCollection = db._instance.collection('repairProcesses');
    const materialsCollection = db._instance.collection('repairMaterials');
    
    // Get all tasks that have pricing data (process-based tasks)
    const tasks = await tasksCollection.find({ 
      pricing: { $exists: true },
      isActive: { $ne: false }
    }).toArray();
    
    console.log(`🔄 Updating pricing for ${tasks.length} tasks`);
    
    const updateOperations = [];
    
    for (const task of tasks) {
      try {
        // Recalculate task pricing with new admin settings
        const updatedPricing = await recalculateTaskPricing(
          task, 
          adminSettings, 
          processesCollection, 
          materialsCollection
        );
        
        updateOperations.push({
          updateOne: {
            filter: { _id: task._id },
            update: {
              $set: {
                pricing: updatedPricing,
                updatedAt: new Date()
              }
            }
          }
        });
        
      } catch (error) {
        console.error(`❌ Error updating task ${task._id}:`, error);
        // Continue with other tasks
      }
    }
    
    if (updateOperations.length > 0) {
      const result = await tasksCollection.bulkWrite(updateOperations);
      console.log(`✅ Updated ${result.modifiedCount} tasks`);
      
      return NextResponse.json({
        success: true,
        updated: result.modifiedCount,
        message: `Updated ${result.modifiedCount} tasks with new pricing`
      });
    }
    
    return NextResponse.json({
      success: true,
      updated: 0,
      message: 'No tasks to update'
    });
    
  } catch (error) {
    console.error('❌ Error updating task pricing:', error);
    return NextResponse.json(
      { error: 'Failed to update task pricing' },
      { status: 500 }
    );
  }
}

/**
 * Recalculate task pricing with current process and material data
 */
async function recalculateTaskPricing(task, adminSettings, processesCollection, materialsCollection) {
  let totalLaborHours = 0;
  let totalProcessCost = 0;
  let totalMaterialCost = 0;
  
  // Calculate from processes
  if (task.processes && task.processes.length > 0) {
    for (const processSelection of task.processes) {
      const quantity = processSelection.quantity || 1;
      
      // Get current process data
      const process = await processesCollection.findOne({ 
        _id: new ObjectId(processSelection.processId) 
      });
      
      if (process) {
        // Labor hours
        totalLaborHours += (process.laborHours || 0) * quantity;
        
        // Process cost (use updated pricing if available)
        if (process.pricing?.totalCost) {
          totalProcessCost += process.pricing.totalCost * quantity;
          
          // Extract material costs from process pricing
          if (process.pricing.baseMaterialsCost) {
            totalMaterialCost += process.pricing.baseMaterialsCost * quantity;
          }
        }
      }
    }
  }
  
  // Calculate from additional materials
  if (task.materials && task.materials.length > 0) {
    for (const materialSelection of task.materials) {
      const quantity = materialSelection.quantity || 1;
      
      // Get current material data
      const material = await materialsCollection.findOne({ 
        _id: new ObjectId(materialSelection.materialId) 
      });
      
      if (material) {
        totalMaterialCost += (material.costPerPortion || 0) * quantity;
      }
    }
  }
  
  // Apply business formula
  const markedUpMaterialCost = totalMaterialCost * (adminSettings.pricing?.materialMarkup || 1.5);
  const laborRate = adminSettings.pricing?.wage || 25;
  const fallbackLaborCost = totalLaborHours * laborRate;
  const baseCost = fallbackLaborCost + totalProcessCost + markedUpMaterialCost;
  
  const businessMultiplier = (
    (adminSettings.pricing?.administrativeFee || 0) + 
    (adminSettings.pricing?.businessFee || 0) + 
    (adminSettings.pricing?.consumablesFee || 0) + 1
  );
  
  const retailPrice = Math.round(baseCost * businessMultiplier * 100) / 100;
  const wholesalePrice = Math.round(retailPrice * 0.5 * 100) / 100;
  
  return {
    totalLaborHours: Math.round(totalLaborHours * 100) / 100,
    totalProcessCost: Math.round(totalProcessCost * 100) / 100,
    totalMaterialCost: Math.round(totalMaterialCost * 100) / 100,
    markedUpMaterialCost: Math.round(markedUpMaterialCost * 100) / 100,
    baseCost: Math.round(baseCost * 100) / 100,
    retailPrice: retailPrice || 0,
    wholesalePrice: wholesalePrice || 0,
    businessMultiplier: Math.round(businessMultiplier * 100) / 100,
    adminSettings: {
      materialMarkup: adminSettings.pricing?.materialMarkup || adminSettings.materialMarkup,
      laborRates: adminSettings.laborRates,
      businessFees: {
        administrativeFee: adminSettings.pricing?.administrativeFee || 0,
        businessFee: adminSettings.pricing?.businessFee || 0,
        consumablesFee: adminSettings.pricing?.consumablesFee || 0
      }
    },
    calculatedAt: new Date().toISOString()
  };
}
