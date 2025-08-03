/**
 * Cascading Updates Service
 * Handles automatic updates when foundational objects change
 * 
 * Update Hierarchy:
 * Admin Settings → Materials, Processes, Tasks
 * Materials → Processes, Tasks  
 * Processes → Tasks
 */

class CascadingUpdatesService {
  
  /**
   * Update all objects when admin settings change
   * @param {Object} newAdminSettings - Updated admin settings
   */
  async updateFromAdminSettings(newAdminSettings) {
    console.log('🔄 Starting cascading updates from admin settings change');
    
    try {
      // 1. Update all materials with new markup
      const materialsUpdateResult = await this.updateAllMaterials(newAdminSettings);
      console.log('✅ Materials updated:', materialsUpdateResult);
      
      // 2. Update all processes with new labor rates and material costs
      const processesUpdateResult = await this.updateAllProcesses(newAdminSettings);
      console.log('✅ Processes updated:', processesUpdateResult);
      
      // 3. Update all tasks with new pricing
      const tasksUpdateResult = await this.updateAllTasks(newAdminSettings);
      console.log('✅ Tasks updated:', tasksUpdateResult);
      
      return {
        success: true,
        materialsUpdated: materialsUpdateResult.updated,
        processesUpdated: processesUpdateResult.updated,
        tasksUpdated: tasksUpdateResult.updated
      };
      
    } catch (error) {
      console.error('❌ Error in cascading admin settings update:', error);
      throw error;
    }
  }
  
  /**
   * Update processes and tasks when materials change
   * @param {Array} updatedMaterialIds - IDs of materials that changed
   */
  async updateFromMaterialsChange(updatedMaterialIds) {
    console.log('🔄 Starting cascading updates from materials change:', updatedMaterialIds);
    
    try {
      // 1. Find processes that use these materials
      const affectedProcesses = await this.findProcessesUsingMaterials(updatedMaterialIds);
      console.log('🔍 Found affected processes:', affectedProcesses.length);
      
      // 2. Update affected processes
      const processesUpdateResult = await this.updateSpecificProcesses(affectedProcesses);
      console.log('✅ Processes updated:', processesUpdateResult);
      
      // 3. Find tasks that use these materials or processes
      const affectedTasks = await this.findTasksUsingMaterialsOrProcesses(
        updatedMaterialIds, 
        affectedProcesses.map(p => p._id)
      );
      console.log('🔍 Found affected tasks:', affectedTasks.length);
      
      // 4. Update affected tasks
      const tasksUpdateResult = await this.updateSpecificTasks(affectedTasks);
      console.log('✅ Tasks updated:', tasksUpdateResult);
      
      return {
        success: true,
        processesUpdated: processesUpdateResult.updated,
        tasksUpdated: tasksUpdateResult.updated
      };
      
    } catch (error) {
      console.error('❌ Error in cascading materials update:', error);
      throw error;
    }
  }
  
  /**
   * Update tasks when processes change
   * @param {Array} updatedProcessIds - IDs of processes that changed
   */
  async updateFromProcessesChange(updatedProcessIds) {
    console.log('🔄 Starting cascading updates from processes change:', updatedProcessIds);
    
    try {
      // 1. Find tasks that use these processes
      const affectedTasks = await this.findTasksUsingProcesses(updatedProcessIds);
      console.log('🔍 Found affected tasks:', affectedTasks.length);
      
      // 2. Update affected tasks
      const tasksUpdateResult = await this.updateSpecificTasks(affectedTasks);
      console.log('✅ Tasks updated:', tasksUpdateResult);
      
      return {
        success: true,
        tasksUpdated: tasksUpdateResult.updated
      };
      
    } catch (error) {
      console.error('❌ Error in cascading processes update:', error);
      throw error;
    }
  }
  
  /**
   * Update all materials with new admin settings
   */
  async updateAllMaterials(adminSettings) {
    const response = await fetch('/api/materials/bulk-update-pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminSettings })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update materials');
    }
    
    return await response.json();
  }
  
  /**
   * Update all processes with new admin settings
   */
  async updateAllProcesses(adminSettings) {
    const response = await fetch('/api/processes/bulk-update-pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminSettings })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update processes');
    }
    
    return await response.json();
  }
  
  /**
   * Update all tasks with new admin settings
   */
  async updateAllTasks(adminSettings) {
    const response = await fetch('/api/tasks/bulk-update-pricing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminSettings })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update tasks');
    }
    
    return await response.json();
  }
  
  /**
   * Find processes that use specific materials
   */
  async findProcessesUsingMaterials(materialIds) {
    const response = await fetch('/api/processes/find-by-materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materialIds })
    });
    
    if (!response.ok) {
      throw new Error('Failed to find processes using materials');
    }
    
    const data = await response.json();
    return data.processes || [];
  }
  
  /**
   * Find tasks that use specific materials or processes
   */
  async findTasksUsingMaterialsOrProcesses(materialIds, processIds) {
    const response = await fetch('/api/tasks/find-by-materials-or-processes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materialIds, processIds })
    });
    
    if (!response.ok) {
      throw new Error('Failed to find tasks using materials or processes');
    }
    
    const data = await response.json();
    return data.tasks || [];
  }
  
  /**
   * Find tasks that use specific processes
   */
  async findTasksUsingProcesses(processIds) {
    const response = await fetch('/api/tasks/find-by-processes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ processIds })
    });
    
    if (!response.ok) {
      throw new Error('Failed to find tasks using processes');
    }
    
    const data = await response.json();
    return data.tasks || [];
  }
  
  /**
   * Update specific processes
   */
  async updateSpecificProcesses(processes) {
    const response = await fetch('/api/processes/update-specific', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ processes })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update specific processes');
    }
    
    return await response.json();
  }
  
  /**
   * Update specific tasks
   */
  async updateSpecificTasks(tasks) {
    const response = await fetch('/api/tasks/update-specific', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tasks })
    });
    
    if (!response.ok) {
      throw new Error('Failed to update specific tasks');
    }
    
    return await response.json();
  }
  
  /**
   * Recalculate pricing for a single object
   * @param {string} type - 'material', 'process', or 'task'
   * @param {Object} object - The object to recalculate
   * @param {Object} adminSettings - Current admin settings
   */
  recalculatePricing(type, object, adminSettings) {
    switch (type) {
      case 'material':
        return this.recalculateMaterialPricing(object, adminSettings);
      case 'process':
        return this.recalculateProcessPricing(object, adminSettings);
      case 'task':
        return this.recalculateTaskPricing(object, adminSettings);
      default:
        throw new Error(`Unknown pricing type: ${type}`);
    }
  }
  
  /**
   * Recalculate material pricing
   */
  recalculateMaterialPricing(material, adminSettings) {
    const basePrice = material.basePrice || material.costPerPortion || 0;
    const materialMarkup = adminSettings.pricing?.materialMarkup || 1.3;
    
    return {
      ...material,
      costPerPortion: basePrice * materialMarkup,
      pricing: {
        basePrice: basePrice,
        materialMarkup: materialMarkup,
        finalPrice: basePrice * materialMarkup,
        calculatedAt: new Date().toISOString()
      }
    };
  }
  
  /**
   * Recalculate process pricing
   */
  recalculateProcessPricing(process, adminSettings) {
    // Labor cost calculation
    const laborRates = adminSettings.laborRates || { basic: 22.5, standard: 30, advanced: 37.5, expert: 45 };
    const hourlyRate = laborRates[process.skillLevel] || laborRates.standard;
    const laborCost = (process.laborHours || 0) * hourlyRate;
    
    // Materials cost calculation
    const materialMarkup = adminSettings.pricing?.materialMarkup || 1.3;
    const baseMaterialsCost = (process.materials || []).reduce((total, material) => {
      return total + (material.estimatedCost || 0);
    }, 0);
    const materialsCost = baseMaterialsCost * materialMarkup;
    
    // Total cost with complexity multiplier
    const multiplier = process.metalComplexityMultiplier || 1.0;
    const totalCost = (laborCost + materialsCost) * multiplier;
    
    return {
      ...process,
      pricing: {
        laborCost: laborCost,
        baseMaterialsCost: baseMaterialsCost,
        materialsCost: materialsCost,
        materialMarkup: materialMarkup,
        hourlyRate: hourlyRate,
        totalCost: totalCost,
        calculatedAt: new Date().toISOString()
      }
    };
  }
  
  /**
   * Recalculate task pricing
   */
  recalculateTaskPricing(task, adminSettings) {
    let totalLaborHours = 0;
    let totalProcessCost = 0;
    let totalMaterialCost = 0;
    
    // Calculate from processes
    if (task.processes) {
      for (const processSelection of task.processes) {
        const quantity = processSelection.quantity || 1;
        
        if (processSelection.process) {
          // Labor hours
          totalLaborHours += (processSelection.process.laborHours || 0) * quantity;
          
          // Process cost
          if (processSelection.process.pricing?.totalCost) {
            totalProcessCost += processSelection.process.pricing.totalCost * quantity;
          }
          
          // Material costs from process
          if (processSelection.process.pricing?.baseMaterialsCost) {
            totalMaterialCost += (processSelection.process.pricing.baseMaterialsCost || 0) * quantity;
          }
        }
      }
    }
    
    // Calculate from additional materials
    if (task.materials) {
      for (const materialSelection of task.materials) {
        const quantity = materialSelection.quantity || 1;
        if (materialSelection.material) {
          totalMaterialCost += (materialSelection.material.costPerPortion || 0) * quantity;
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
      ...task,
      pricing: {
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
      }
    };
  }
}

// Export singleton instance
export const cascadingUpdatesService = new CascadingUpdatesService();
export default cascadingUpdatesService;
