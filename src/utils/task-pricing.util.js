/**
 * Task Pricing Utilities
 * Handles pricing calculations for tasks using the new process and material structures
 * 
 * @deprecated This class is deprecated in favor of PricingEngine.
 * Methods now call PricingEngine internally for backward compatibility.
 */

import pricingEngine from '@/services/PricingEngine';

export class TaskPricingUtil {
  /**
   * Calculate task pricing based on new process and material structures
   * 
   * @deprecated This method is deprecated. Use PricingEngine.calculateTaskCost() instead.
   * This method now calls PricingEngine internally for backward compatibility.
   * 
   * @param {Object} taskData - Task data with processes
   * @param {string} selectedMetal - Selected metal type for pricing (e.g., "Sterling Silver 925")
   * @param {Object} adminSettings - Admin settings with hourly rate and markups
   * @returns {Object} Complete pricing breakdown
   */
  static calculateTaskPricing(taskData, selectedMetal = null, adminSettings = {}) {
    console.warn('⚠️ DEPRECATED: TaskPricingUtil.calculateTaskPricing() - Please migrate to PricingEngine.calculateTaskCost()');
    
    // Use PricingEngine for consistent calculations
    try {
      const pricing = pricingEngine.calculateTaskCost(taskData, adminSettings);
      
      // Transform PricingEngine output to match old format for backward compatibility
      return {
        pricing: {
          totalLaborHours: pricing.totalLaborHours,
          totalLaborCost: pricing.totalProcessCost, // Note: PricingEngine combines process costs
          totalMaterialsCost: pricing.totalMaterialCost,
          markedUpMaterialCost: pricing.markedUpMaterialCost,
          baseCost: pricing.baseCost,
          retailPrice: pricing.retailPrice,
          wholesalePrice: pricing.wholesalePrice,
          businessMultiplier: pricing.businessMultiplier,
          calculatedAt: pricing.calculatedAt,
          pricingType: 'universal'
        },
        basePrice: pricing.retailPrice,
        laborHours: pricing.totalLaborHours
      };
    } catch (error) {
      console.error('🔥 TASK-PRICING - Error calculating pricing:', error);
      return this.getDefaultPricing();
    }
  }
  
  /**
   * @deprecated Legacy implementation - kept for reference only
   * Use PricingEngine.calculateTaskCost() instead
   */
  static _legacyCalculateTaskPricing(taskData, selectedMetal = null, adminSettings = {}) {
    try {
      console.log('🔥 TASK-PRICING - Starting calculation for task:', taskData.title || 'Unnamed Task');
      
      if (!taskData.processes || taskData.processes.length === 0) {
        console.log('🔥 TASK-PRICING - No processes found, returning default pricing');
        return this.getDefaultPricing();
      }

      const hourlyRate = adminSettings.pricing?.wage || 40;
      const materialMarkup = adminSettings.pricing?.materialMarkup || 2;
      const businessMultiplier = adminSettings.pricing?.businessMultiplier || 1.5;

      let totalLaborHours = 0;
      let totalLaborCost = 0;
      let totalMaterialsCost = 0;
      let metalVariantPricing = {};
      
      // Process each selected process
      taskData.processes.forEach((processSelection, index) => {
        const quantity = processSelection.quantity || 1;
        const process = processSelection.process;
        
        console.log(`🔥 TASK-PRICING - Processing process ${index + 1}: ${process.displayName} x${quantity}`);
        
        // Always add labor costs (universal)
        const processLaborHours = process.laborHours * quantity;
        const processLaborCost = processLaborHours * hourlyRate;
        totalLaborHours += processLaborHours;
        totalLaborCost += processLaborCost;
        
        console.log(`🔥 TASK-PRICING - Process labor: ${processLaborHours}hrs x $${hourlyRate} = $${processLaborCost}`);
        
        // Check if this process has multi-variant materials
        const hasMultiVariantMaterials = process.materials?.some(material => 
          material.stullerProducts && 
          Array.isArray(material.stullerProducts) && 
          material.stullerProducts.length > 1 &&
          material.isMetalDependent
        );
        
        if (hasMultiVariantMaterials) {
          console.log(`🔥 TASK-PRICING - Process ${process.displayName} has multi-variant materials`);
          
          // Extract all metal variants from process materials
          const metalVariants = new Set();
          process.materials.forEach(material => {
            if (material.stullerProducts && material.isMetalDependent) {
              material.stullerProducts.forEach(product => {
                if (product.metalType && product.karat) {
                  const variantKey = `${this.formatMetalLabel(product.metalType, product.karat)}`;
                  metalVariants.add(variantKey);
                  
                  // Initialize variant pricing if not exists
                  if (!metalVariantPricing[variantKey]) {
                    metalVariantPricing[variantKey] = {
                      laborCost: 0,
                      materialsCost: 0,
                      totalCost: 0
                    };
                  }
                  
                  // Add labor cost to this variant
                  metalVariantPricing[variantKey].laborCost += processLaborCost;
                  
                  // Calculate material cost for this specific variant
                  const materialCost = (product.costPerPortion || 0) * material.quantity * quantity;
                  metalVariantPricing[variantKey].materialsCost += materialCost;
                  metalVariantPricing[variantKey].totalCost += processLaborCost + materialCost;
                  
                  console.log(`🔥 TASK-PRICING - Variant ${variantKey}: Material ${material.materialName} = $${materialCost}`);
                }
              });
            }
          });
        } else if (process.pricing) {
          // Process has stored pricing - use it
          if (process.pricing.totalCost && typeof process.pricing.totalCost === 'object') {
            // Multi-variant stored pricing
            Object.keys(process.pricing.totalCost).forEach(metalKey => {
              if (!metalVariantPricing[metalKey]) {
                metalVariantPricing[metalKey] = { laborCost: 0, materialsCost: 0, totalCost: 0 };
              }
              
              const processLaborCost = (process.pricing.laborCost || 0) * quantity;
              const processMaterialCost = (process.pricing.materialsCost[metalKey] || 0) * quantity;
              const processTotalCost = (process.pricing.totalCost[metalKey] || 0) * quantity;
              
              metalVariantPricing[metalKey].laborCost += processLaborCost;
              metalVariantPricing[metalKey].materialsCost += processMaterialCost;
              metalVariantPricing[metalKey].totalCost += processTotalCost;
            });
          } else if (process.pricing.baseMaterialsCost !== undefined) {
            // Universal pricing - single cost for all metals
            const processMaterialCost = process.pricing.baseMaterialsCost * quantity;
            totalMaterialsCost += processMaterialCost;
            
            console.log(`🔥 TASK-PRICING - Process materials: $${processMaterialCost}`);
          }
        } else {
          // No stored pricing and no multi-variant materials - add universal material cost
          if (process.materials) {
            process.materials.forEach(material => {
              const materialCost = (material.estimatedCost || 0) * quantity;
              totalMaterialsCost += materialCost;
            });
          }
        }
      }); // Close the main taskData.processes.forEach loop
      
      // Process task-level materials (materials added directly to the task, not within processes)
      if (taskData.materials && taskData.materials.length > 0) {
        console.log(`🔥 TASK-PRICING - Processing ${taskData.materials.length} task-level materials`);
        
        taskData.materials.forEach((materialSelection, index) => {
          const quantity = materialSelection.quantity || 1;
          const material = materialSelection.material;
          
          console.log(`🔥 TASK-PRICING - Processing task material ${index + 1}: ${material?.displayName || material?.name} x${quantity}`);
          
          if (material && material.stullerProducts && material.isMetalDependent && material.stullerProducts.length > 1) {
            // Multi-variant material - add to variant pricing
            material.stullerProducts.forEach(product => {
              if (product.metalType && product.karat) {
                const variantKey = this.formatMetalLabel(product.metalType, product.karat);
                
                if (!metalVariantPricing[variantKey]) {
                  metalVariantPricing[variantKey] = {
                    laborCost: 0,
                    materialsCost: 0,
                    totalCost: 0
                  };
                }
                
                const materialCost = (product.costPerPortion || 0) * quantity;
                metalVariantPricing[variantKey].materialsCost += materialCost;
                metalVariantPricing[variantKey].totalCost += materialCost;
                
                console.log(`🔥 TASK-PRICING - Added task material ${material.displayName || material.name} to variant ${variantKey}: $${materialCost}`);
              }
            });
          } else {
            // Universal material - add to total
            const materialCost = (material?.costPerPortion || material?.unitCost || 0) * quantity;
            totalMaterialsCost += materialCost;
            
            console.log(`🔥 TASK-PRICING - Added universal task material ${material?.displayName || material?.name}: $${materialCost}`);
          }
        });
      }
      
      // If we have metal variant pricing, return detailed breakdown
      if (Object.keys(metalVariantPricing).length > 0) {
        return this.buildVariantPricing(metalVariantPricing, businessMultiplier, hourlyRate);
      }

      // Standard universal pricing
      const totalBaseCost = totalLaborCost + totalMaterialsCost;
      const retailPrice = totalBaseCost * businessMultiplier;

      console.log('🔥 TASK-PRICING - Final universal pricing:', {
        totalLaborHours,
        totalLaborCost,
        totalMaterialsCost,
        totalBaseCost,
        retailPrice
      });

      return {
        pricing: {
          totalLaborHours,
          totalLaborCost,
          totalMaterialsCost,
          markedUpMaterialCost: totalMaterialsCost * materialMarkup,
          baseCost: totalBaseCost,
          retailPrice,
          businessMultiplier,
          calculatedAt: new Date().toISOString(),
          pricingType: 'universal'
        },
        basePrice: retailPrice,
        laborHours: totalLaborHours
      };
    } catch (error) {
      console.error('🔥 TASK-PRICING - Error calculating pricing:', error);
      return this.getDefaultPricing();
    }
  }

  /**
   * Build variant pricing structure for multi-metal tasks
   */
  static buildVariantPricing(metalVariantPricing, businessMultiplier, hourlyRate) {
    const variants = {};
    const retailPrices = {};

    Object.keys(metalVariantPricing).forEach(metalKey => {
      const variant = metalVariantPricing[metalKey];
      const retailPrice = variant.totalCost * businessMultiplier;

      variants[metalKey] = {
        laborCost: variant.laborCost,
        materialsCost: variant.materialsCost,
        totalCost: variant.totalCost,
        retailPrice
      };

      retailPrices[metalKey] = retailPrice;
    });

    // Use the first variant for base pricing
    const firstVariant = Object.values(variants)[0];
    
    return {
      pricing: {
        totalLaborHours: firstVariant.laborCost / hourlyRate,
        totalLaborCost: firstVariant.laborCost,
        totalMaterialsCost: firstVariant.materialsCost,
        markedUpMaterialCost: firstVariant.materialsCost * 2, // Assuming 2x markup
        baseCost: firstVariant.totalCost,
        retailPrice: firstVariant.retailPrice,
        businessMultiplier,
        calculatedAt: new Date().toISOString(),
        pricingType: 'variant',
        variants,
        retailPrices
      },
      basePrice: firstVariant.retailPrice,
      laborHours: firstVariant.laborCost / hourlyRate
    };
  }

  /**
   * Get default pricing structure
   */
  static getDefaultPricing() {
    return {
      pricing: {
        totalLaborHours: 0,
        totalLaborCost: 0,
        totalMaterialsCost: 0,
        markedUpMaterialCost: 0,
        baseCost: 0,
        retailPrice: 0,
        wholesalePrice: 0,
        businessMultiplier: 1.5,
        calculatedAt: new Date().toISOString(),
        pricingType: 'universal'
      },
      basePrice: 0,
      laborHours: 0
    };
  }

  /**
   * Calculate pricing for a specific metal variant
   * @param {Object} taskData - Task data with processes
   * @param {string} metalKey - Specific metal variant (e.g., "Sterling Silver 925")
   * @param {Object} adminSettings - Admin settings
   * @returns {Object} Pricing for the specific metal
   */
  static calculateVariantPricing(taskData, metalKey, adminSettings = {}) {
    const fullPricing = this.calculateTaskPricing(taskData, metalKey, adminSettings);
    
    if (fullPricing.pricing.pricingType === 'variant' && fullPricing.pricing.variants[metalKey]) {
      return fullPricing.pricing.variants[metalKey];
    }
    
    // Return universal pricing if no variant found
    return {
      laborCost: fullPricing.pricing.totalLaborCost,
      materialsCost: fullPricing.pricing.totalMaterialsCost,
      totalCost: fullPricing.pricing.baseCost,
      retailPrice: fullPricing.pricing.retailPrice,
      wholesalePrice: fullPricing.pricing.wholesalePrice
    };
  }

  /**
   * Get available metal variants from task processes
   * @param {Object} taskData - Task data with processes
   * @returns {Array} Array of available metal variants
   */
  static getAvailableMetalVariants(taskData) {
    if (!taskData.processes || taskData.processes.length === 0) {
      return [];
    }

    const metalVariants = new Set();

    taskData.processes.forEach(processSelection => {
      const process = processSelection.process;
      if (process && process.pricing && process.pricing.totalCost && typeof process.pricing.totalCost === 'object') {
        Object.keys(process.pricing.totalCost).forEach(metalKey => {
          metalVariants.add(metalKey);
        });
      }
    });

    return Array.from(metalVariants).sort();
  }

  /**
   * Transform task for database storage with pricing
   * @param {Object} taskData - Task data
   * @param {Object} adminSettings - Admin settings
   * @returns {Object} Task data ready for database
   */
  static prepareTaskForDatabase(taskData, adminSettings = {}) {
    const pricing = this.calculateTaskPricing(taskData, null, adminSettings);
    
    return {
      ...taskData,
      ...pricing,
      metalVariants: this.getAvailableMetalVariants(taskData),
      updatedAt: new Date(),
      pricingCalculatedAt: new Date()
    };
  }

  /**
   * Format metal type and karat into a readable label
   */
  static formatMetalLabel(metalType, karat) {
    const metalNames = {
      'sterling_silver': 'Sterling Silver',
      'yellow_gold': 'Yellow Gold',
      'white_gold': 'White Gold', 
      'rose_gold': 'Rose Gold',
      'platinum': 'Platinum'
    };
    
    const metalName = metalNames[metalType] || metalType.replace(/_/g, ' ');
    return karat && karat !== 'standard' ? `${metalName} ${karat}` : metalName;
  }
}

export default TaskPricingUtil;
