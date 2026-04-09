export default class PriceRecalculationService {
  /**
   * Recalculate all repair task prices with new settings
   * @param {Object} dbInstance MongoDB database instance
   * @param {Object} pricingSettings Updated pricing configuration
   * @returns {Object} Result of the bulk write operation
   */
  static async recalculateAllPrices(dbInstance, pricingSettings) {
    try {
      const repairTasks = await dbInstance.collection('repairTasks').find({}).toArray();
      const bulkOps = [];
      
      let successCount = 0;
      let errorCount = 0;
      const errors = [];

      for (const task of repairTasks) {
        try {
          // Calculate new price using the business formula
          const laborCost = task.laborHours * pricingSettings.wage;
          const materialMarkup = task.materialCost * (pricingSettings.materialMarkup || 1.5);
          const subtotal = laborCost + materialMarkup;
          
          const businessMultiplier = pricingSettings.administrativeFee + 
                                   pricingSettings.businessFee + 
                                   pricingSettings.consumablesFee + 
                                   (pricingSettings.marketingFee || 0) + 1;
          
          const newBasePrice = Math.round(subtotal * businessMultiplier * 100) / 100;

          bulkOps.push({
            updateOne: {
              filter: { _id: task._id },
              update: {
                $set: {
                  basePrice: newBasePrice,
                  'pricing.calculatedAt': new Date(),
                  'pricing.formula': 'v2.0_business_formula',
                  'pricing.components': {
                    laborHours: task.laborHours,
                    laborCost: laborCost,
                    materialCost: task.materialCost,
                    materialMarkup: materialMarkup,
                    materialMarkupMultiplier: pricingSettings.materialMarkup || 1.5,
                    businessMultiplier: businessMultiplier,
                    wage: pricingSettings.wage,
                    fees: {
                      administrative: pricingSettings.administrativeFee,
                      business: pricingSettings.businessFee,
                      consumables: pricingSettings.consumablesFee,
                      marketing: pricingSettings.marketingFee || 0
                    },
                    // New pricing components
                    rushMultiplier: pricingSettings.rushMultiplier || 1.5,
                    deliveryFee: pricingSettings.deliveryFee || 0,
                    taxRate: pricingSettings.taxRate || 0
                  }
                }
              }
            }
          });

          successCount++;

        } catch (error) {
          errorCount++;
          errors.push({
            taskId: task._id,
            sku: task.sku,
            error: error.message
          });
        }
      }

      // Execute bulk update
      if (bulkOps.length > 0) {
        const result = await dbInstance.collection('repairTasks').bulkWrite(bulkOps);
        
        return {
          totalTasks: repairTasks.length,
          updated: result.modifiedCount,
          errors: errorCount,
          errorDetails: errors.slice(0, 5), // Limit error details
          timestamp: new Date()
        };
      }

      return {
        totalTasks: 0,
        updated: 0,
        errors: 0,
        errorDetails: [],
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Price recalculation error:', error);
      throw error;
    }
  }
}
