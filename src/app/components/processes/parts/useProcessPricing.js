import { useMemo } from 'react';
import pricingEngine from '@/services/PricingEngine';

export const useProcessPricing = (process, adminSettings) => {
  return useMemo(() => {
    let costData = {
      totalCost: 0,
      laborCost: 0,
      materialsCost: 0,
      materialMarkup: 1.0,
      complexityMultiplier: 1.0
    };
    let isMultiVariant = false;
    let priceRange = null;

    // Check if this process has materials with multiple metal variants
    const hasMultiVariantMaterials = process.materials?.some(material => 
      material.stullerProducts && Array.isArray(material.stullerProducts) && material.stullerProducts.length > 1
    );

    // Always check if process should be multi-variant by examining its materials (only needed for fallback)
    const costBreakdown = hasMultiVariantMaterials && !process.pricing ? pricingEngine.calculateProcessCost(process, adminSettings) : null;

    // Check for new pricing structure first
    if (process.pricing && process.pricing.totalCost) {
      // New pricing structure: totalCost is an object with metal/karat keys
      if (typeof process.pricing.totalCost === 'object' && !Array.isArray(process.pricing.totalCost)) {
        const totalCosts = Object.values(process.pricing.totalCost).filter(cost => cost > 0);
        const materialsCosts = typeof process.pricing.materialsCost === 'object' ? 
          Object.values(process.pricing.materialsCost).filter(cost => cost > 0) : [];
        
        if (totalCosts.length > 1) {
          // Multi-variant process - show price range
          isMultiVariant = true;
          const minPrice = Math.min(...totalCosts);
          const maxPrice = Math.max(...totalCosts);
          priceRange = { min: minPrice, max: maxPrice };
          
          costData = {
            totalCost: minPrice, // Use minimum for fallback display
            laborCost: process.pricing.laborCost || 0,
            materialsCost: materialsCosts.length > 0 ? Math.min(...materialsCosts) : 0,
            materialMarkup: process.pricing.materialMarkup || 1.0,
            complexityMultiplier: 1.0
          };
        } else {
          // Single variant or universal
          costData = {
            totalCost: totalCosts[0] || 0,
            laborCost: process.pricing.laborCost || 0,
            materialsCost: materialsCosts[0] || 0,
            materialMarkup: process.pricing.materialMarkup || 1.0,
            complexityMultiplier: 1.0
          };
        }
      } else {
        // Legacy pricing structure: totalCost is a number
        costData = {
          totalCost: process.pricing.totalCost || 0,
          laborCost: process.pricing.laborCost || 0,
          materialsCost: process.pricing.materialsCost || 0,
          materialMarkup: process.pricing.materialMarkup || 1.0,
          complexityMultiplier: 1.0
        };
      }
    }
    // Fallback to old metalPrices structure  
    else if (process.metalPrices && Object.keys(process.metalPrices).length > 0) {
      // Multi-variant process with stored pricing - show price range
      isMultiVariant = true;
      const prices = Object.values(process.metalPrices).map(p => p.totalCost);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      
      priceRange = { min: minPrice, max: maxPrice };
      costData = {
        totalCost: minPrice, // Use minimum for fallback display
        laborCost: Object.values(process.metalPrices)[0]?.laborCost || 0,
        materialsCost: Object.values(process.metalPrices)[0]?.materialsCost || 0,
        materialMarkup: Object.values(process.metalPrices)[0]?.materialMarkup || 1.0,
        complexityMultiplier: process.metalComplexityMultiplier || 1.0
      };
    }
    // Fallback to calculated costs
    else if (costBreakdown) {
      if (costBreakdown.isMetalDependent && costBreakdown.metalPrices) {
        // Multi-variant process - show price range
        isMultiVariant = true;
        const prices = Object.values(costBreakdown.metalPrices).map(p => p.totalCost);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        priceRange = { min: minPrice, max: maxPrice };
        
        costData = {
          totalCost: minPrice, // Use minimum for fallback display
          laborCost: costBreakdown.metalPrices[Object.keys(costBreakdown.metalPrices)[0]]?.laborCost || 0,
          materialsCost: costBreakdown.metalPrices[Object.keys(costBreakdown.metalPrices)[0]]?.materialsCost || 0,
          materialMarkup: costBreakdown.metalPrices[Object.keys(costBreakdown.metalPrices)[0]]?.materialMarkup || 1.0,
          complexityMultiplier: 1.0
        };
      } else if (costBreakdown.universal) {
        // Universal pricing process
        costData = {
          totalCost: costBreakdown.universal.totalCost,
          laborCost: costBreakdown.universal.laborCost,
          materialsCost: costBreakdown.universal.materialsCost,
          materialMarkup: costBreakdown.universal.materialMarkup || 1.0,
          complexityMultiplier: 1.0
        };
      }
    }

    return {
      costData,
      isMultiVariant,
      priceRange
    };
  }, [process, adminSettings]);
};
