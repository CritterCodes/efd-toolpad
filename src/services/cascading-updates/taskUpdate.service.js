import pricingEngine from '@/services/PricingEngine';

export class TaskUpdateService {
  static async updateAllTasks(adminSettings) {
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
  static async findTasksUsingMaterialsOrProcesses(materialIds, processIds) {
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
  static async findTasksUsingProcesses(processIds) {
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
  static async updateSpecificTasks(tasks) {
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
   * 
   * @deprecated This method is deprecated. Use PricingEngine.calculateProcessCost() instead.
   * This method now calls PricingEngine internally for backward compatibility.
   */
  recalculateProcessPricing(process, adminSettings) {
    console.warn('⚠️ DEPRECATED: CascadingUpdatesService.recalculateProcessPricing() - Please migrate to PricingEngine.calculateProcessCost()');
    
    // Use PricingEngine for consistent calculations
    const pricingEngine = require('@/services/PricingEngine').default;
    const pricing = pricingEngine.calculateProcessCost(process, adminSettings);
    
    return {
      ...process,
      pricing: {
        ...pricing,
        calculatedAt: new Date().toISOString()
      }
    };
  }
  
  /**
   * Recalculate task pricing
   * 
   * @deprecated This method is deprecated. Use PricingEngine.calculateTaskCost() instead.
   * This method now calls PricingEngine internally for backward compatibility.
   */
  recalculateTaskPricing(task, adminSettings) {
    console.warn('⚠️ DEPRECATED: CascadingUpdatesService.recalculateTaskPricing() - Please migrate to PricingEngine.calculateTaskCost()');
    
    // Use PricingEngine for consistent calculations
    const pricing = pricingEngine.calculateTaskCost(task, adminSettings);
    
    return {
      ...task,
      pricing: {
        ...pricing,
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
export const taskUpdateService = new TaskUpdateService();
export default taskUpdateService;
