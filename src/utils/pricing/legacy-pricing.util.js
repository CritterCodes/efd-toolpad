import { getDefaultPricing } from './core-pricing.util';
import { formatMetalLabel } from './formatting-pricing.util';
import { buildVariantPricing } from './variant-pricing.util';

/**
 * @deprecated Legacy implementation - kept for reference only
 * Use PricingEngine.calculateTaskCost() instead
 */
export function _legacyCalculateTaskPricing(taskData, selectedMetal = null, adminSettings = {}) {
  try {
    console.log('🔥 TASK-PRICING - Starting calculation for task:', taskData.title || 'Unnamed Task');
    
    if (!taskData.processes || taskData.processes.length === 0) {
      console.log('🔥 TASK-PRICING - No processes found, returning default pricing');
      return getDefaultPricing();
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
                const variantKey = `${formatMetalLabel(product.metalType, product.karat)}`;
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
              const variantKey = formatMetalLabel(product.metalType, product.karat);
              
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
      return buildVariantPricing(metalVariantPricing, businessMultiplier, hourlyRate);
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
    return getDefaultPricing();
  }
}