import { useState, useCallback, useEffect } from 'react';
import pricingEngine from '@/services/PricingEngine';
import { getMetalVariantsFromMaterials, parseMetalKey } from '@/utils/processes.util';

export function useTaskPricing({ formData, adminSettings, availableProcesses, availableMaterials }) {
  const [pricePreview, setPricePreview] = useState(null);
  const [pricesByMetal, setPricesByMetal] = useState({});

  // Calculate metal-specific pricing
  const calculateMetalSpecificPricing = useCallback(async () => {
    if (!adminSettings || (formData.processes.length === 0 && formData.materials.length === 0)) {
      setPricePreview(null);
      setPricesByMetal({});
      return;
    }

    try {
      // Use the same robust metal variant detection as process creation
      const relevantMetalVariants = getMetalVariantsFromMaterials(formData.materials || [], availableMaterials);
      
      // Also check processes for additional metal variants (legacy support)
      const processMetalVariantsMap = new Map();
      for (const processSelection of formData.processes) {
        const process = availableProcesses.find(p => p._id === processSelection.processId);
        if (!process) continue;

        // Primary: check process.materials for metal-dependent materials with stullerProducts
        if (Array.isArray(process.materials)) {
          process.materials.forEach(material => {
            if (material.isMetalDependent && Array.isArray(material.stullerProducts)) {
              material.stullerProducts.forEach(product => {
                if (product.metalType && product.karat) {
                  const variantKey = `${product.metalType}_${product.karat}`.toLowerCase().replace(/[^a-z0-9]/g, '_');
                  if (!processMetalVariantsMap.has(variantKey)) {
                    const metalLabel = product.metalType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' ' + product.karat.toUpperCase();
                    processMetalVariantsMap.set(variantKey, { metalType: product.metalType, karat: product.karat, metalLabel });

                  }
                }
              });
            }
          });
        }

        // Fallback: check stored process.pricing.metalPrices (keys like "yellow_gold_14k")
        if (process.pricing?.metalPrices && typeof process.pricing.metalPrices === 'object') {
          Object.keys(process.pricing.metalPrices).forEach(key => {
            if (!processMetalVariantsMap.has(key)) {
              // Parse underscore-separated key: e.g. yellow_gold_14k → metalType=yellow_gold, karat=14k
              const karatMatch = key.match(/_(\d+k|\d{3}|standard)$/i);
              if (karatMatch) {
                const karat = karatMatch[1].toLowerCase();
                const metalType = key.slice(0, key.length - karatMatch[0].length);
                const metalLabel = metalType.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') + ' ' + karat.toUpperCase();
                processMetalVariantsMap.set(key, { metalType, karat, metalLabel });
              }
            }
          });
        }
      }
      
      // Combine material variants with process variants and ensure all have metalLabel
      const allMetalVariants = [...relevantMetalVariants].map(variant => ({
        ...variant,
        metalLabel: variant.metalLabel || `${variant.metalType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} ${variant.karat}`
      }));
      processMetalVariantsMap.forEach(variant => {
        const existingVariant = allMetalVariants.find(v => 
          v.metalType === variant.metalType && v.karat === variant.karat
        );
        if (!existingVariant) {
          allMetalVariants.push({
            ...variant,
            metalLabel: variant.metalLabel || `${variant.metalType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} ${variant.karat}`
          });
        }
      });
      
      const metalVariants = allMetalVariants;
      const priceCalculations = {};
      const metalComplexityMultipliers = adminSettings.metalComplexityMultipliers || {};
      
      // If no metal-specific materials found, create universal pricing
      if (metalVariants.length === 0) {
        let totalLaborHours = 0;
        let totalProcessCost = 0;
        let taskMaterialCost = 0;

        // Calculate process costs
        for (const processSelection of formData.processes) {
          const process = availableProcesses.find(p => p._id === processSelection.processId);
          if (process) {
            const quantity = processSelection.quantity || 1;
            const laborHours = (process.laborHours || 0) * quantity;
            totalLaborHours += laborHours;
            
            // Use stored pricing if available, otherwise calculate
            if (process.pricing?.totalCost) {
              totalProcessCost += process.pricing.totalCost * quantity;
            } else {
              // Fallback calculation
              const laborCost = laborHours * (adminSettings.pricing?.wage || 30);
              totalProcessCost += laborCost;
            }
          }
        }

        // Calculate additional task materials
        for (const materialSelection of formData.materials) {
          const material = availableMaterials.find(m => m._id === materialSelection.materialId);
          if (material) {
            const quantity = materialSelection.quantity || 1;
            taskMaterialCost += (material.unitCost || 0) * quantity;
          }
        }

        // Use PricingEngine for consistent calculations
        const taskData = {
          processes: formData.processes.map(ps => ({
            processId: ps.processId,
            quantity: ps.quantity || 1
          })),
          materials: formData.materials.map(ms => ({
            materialId: ms.materialId,
            quantity: ms.quantity || 1
          })),
          minimumPrice: formData.minimumPrice,
          priceOverride: formData.priceOverride,
          minimumWholesalePrice: formData.minimumWholesalePrice,
          minimumLaborPrice: formData.minimumLaborPrice,
          variantPricingAdjustments: formData.variantPricingAdjustments || {}
        };
        
        const pricing = pricingEngine.calculateTaskCost(taskData, adminSettings, availableProcesses, availableMaterials);
        
        const laborCost = Math.round((pricing.laborCost || 0) * 100) / 100;
        const baseMaterialCost = Math.round(((pricing.baseCost || 0) - laborCost) * 100) / 100;
        
        priceCalculations['universal'] = {
          metalLabel: 'Universal Pricing',
          metalType: 'universal',
          karat: 'all',
          totalLaborHours: pricing.totalLaborHours,
          laborCost: laborCost,
          baseMaterialCost: baseMaterialCost,
          baseCost: pricing.baseCost,
          retailPrice: pricing.retailPrice,
          wholesalePrice: pricing.wholesalePrice,
          businessMultiplier: pricing.businessMultiplier,
          metalComplexity: 1.0
        };
      } else {
        for (const variant of metalVariants) {
          const { metalType, karat, metalLabel } = variant;
          const metalComplexity = metalComplexityMultipliers[metalType] || 1.0;
          const variantKey = `${metalType}_${karat}`;

          const taskDataForMetal = {
            processes: formData.processes.map(ps => ({ processId: ps.processId, quantity: ps.quantity || 1 })),
            materials: formData.materials.map(ms => ({ materialId: ms.materialId, quantity: ms.quantity || 1 })),
            minimumPrice: formData.minimumPrice,
            priceOverride: formData.priceOverride,
            minimumWholesalePrice: formData.minimumWholesalePrice,
            minimumLaborPrice: formData.minimumLaborPrice,
            variantPricingAdjustments: formData.variantPricingAdjustments || {}
          };

          const pricingForMetal = pricingEngine.calculateTaskCost(
            taskDataForMetal,
            adminSettings,
            availableProcesses,
            availableMaterials,
            { metalType, karat }
          );

          const laborCost = Math.round((pricingForMetal.laborCost || 0) * 100) / 100;
          const baseMaterialCost = Math.round(((pricingForMetal.baseCost || 0) - laborCost) * 100) / 100;

          priceCalculations[variantKey] = {
            metalLabel,
            metalType,
            karat,
            totalLaborHours: Math.round((pricingForMetal.totalLaborHours || 0) * 100) / 100,
            laborCost: laborCost,
            baseMaterialCost: baseMaterialCost,
            baseCost: Math.round((pricingForMetal.baseCost || 0) * 100) / 100,
            retailPrice: Math.round((pricingForMetal.retailPrice || 0) * 100) / 100,
            wholesalePrice: Math.round((pricingForMetal.wholesalePrice || 0) * 100) / 100,
            businessMultiplier: Math.round((pricingForMetal.businessMultiplier || 1) * 100) / 100,
            metalComplexity
          };
        }
      }
      
      setPricesByMetal(priceCalculations);
      
      // Keep backward compatibility by setting first price as preview
      const firstPrice = Object.values(priceCalculations)[0];
      setPricePreview(firstPrice || null);

    } catch (error) {
      console.error('❌ Error calculating metal-specific pricing:', error);
      setPricePreview(null);
      setPricesByMetal({});
    }
  }, [formData.processes, formData.materials, formData.minimumPrice, formData.priceOverride, formData.minimumWholesalePrice, formData.minimumLaborPrice, formData.variantPricingAdjustments, adminSettings, availableProcesses, availableMaterials]);

  // Recalculate pricing when form changes
  useEffect(() => {
    calculateMetalSpecificPricing();
  }, [calculateMetalSpecificPricing]);
  return { pricePreview, pricesByMetal };
}
