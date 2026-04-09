'use client';

import { useState, useCallback } from 'react';
import pricingEngine from '@/services/PricingEngine';

export const useProcessForm = (formData, setFormData, adminSettings, availableMaterials) => {
  const [materialLines, setMaterialLines] = useState([]);

  const handleAddMaterialLine = useCallback(() => {
    const newLine = {
      id: Date.now(),
      material: null,
      quantity: ''
    };
    setMaterialLines(prev => [...prev, newLine]);
  }, []);

  const handleRemoveMaterialLine = useCallback((lineId) => {
    setMaterialLines(prev => prev.filter(line => line.id !== lineId));
    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter(material => material.lineId !== lineId)
    }));
  }, [setFormData]);

  const updateFormDataMaterial = useCallback((lineId, selectedMaterial, quantity) => {
    if (!selectedMaterial || !quantity) return;

    const portionsPerUnit = selectedMaterial.portionsPerUnit || 1;
    let baseCostPerPortion = 0;
    
    if (!selectedMaterial.isMetalDependent) {
      if (selectedMaterial.stullerProducts && selectedMaterial.stullerProducts.length > 0) {
        const firstProduct = selectedMaterial.stullerProducts[0];
        if (firstProduct.costPerPortion !== undefined) {
          baseCostPerPortion = firstProduct.costPerPortion;
        } else {
          baseCostPerPortion = (firstProduct.stullerPrice || 0) / portionsPerUnit;
        }
      } else if (selectedMaterial.unitCost && selectedMaterial.unitCost > 0) {
        baseCostPerPortion = selectedMaterial.unitCost / portionsPerUnit;
      }
    } else if (selectedMaterial.stullerProducts && selectedMaterial.stullerProducts.length > 0) {
      const costPerPortions = selectedMaterial.stullerProducts
        .map(p => p.costPerPortion)
        .filter(cost => cost !== undefined && cost > 0);
      
      if (costPerPortions.length > 0) {
        baseCostPerPortion = Math.min(...costPerPortions);
      } else {
        const stullerPrices = selectedMaterial.stullerProducts
          .map(p => p.stullerPrice || 0)
          .filter(price => price > 0);
        if (stullerPrices.length > 0) {
          baseCostPerPortion = Math.min(...stullerPrices) / portionsPerUnit;
        }
      }
    } else if (selectedMaterial.variants && selectedMaterial.variants.length > 0) {
      const baseVariant = selectedMaterial.variants[0];
      baseCostPerPortion = baseVariant.price / portionsPerUnit;
    }
    
    const baseTotalCost = baseCostPerPortion * quantity;
    
    const newMaterial = {
      lineId: lineId,
      materialId: selectedMaterial._id,
      materialName: selectedMaterial.displayName,
      materialSku: selectedMaterial.sku,
      quantity: quantity,
      unit: selectedMaterial.portionType || 'portion',
      stullerProducts: selectedMaterial.stullerProducts || [],
      portionsPerUnit: portionsPerUnit,
      baseCostPerPortion: baseCostPerPortion,
      estimatedCost: baseTotalCost,
      isMetalDependent: selectedMaterial.isMetalDependent || (selectedMaterial.stullerProducts?.length > 0) || false,
      metalTypes: selectedMaterial.metalTypes || []
    };

    setFormData(prev => ({
      ...prev,
      materials: prev.materials.filter(m => m.lineId !== lineId).concat(newMaterial)
    }));
  }, [setFormData]);

  const handleMaterialSelect = useCallback((lineId, material) => {
    setMaterialLines(prev => prev.map(line => 
      line.id === lineId ? { ...line, material } : line
    ));

    const line = materialLines.find(l => l.id === lineId);
    if (line && line.quantity && material) {
      const numQuantity = parseFloat(line.quantity);
      if (!isNaN(numQuantity) && numQuantity > 0) {
        updateFormDataMaterial(lineId, material, numQuantity);
      }
    }
  }, [materialLines, updateFormDataMaterial]);

  const handleQuantityChange = useCallback((lineId, quantity) => {
    setMaterialLines(prev => prev.map(line => 
      line.id === lineId ? { ...line, quantity } : line
    ));
    
    const line = materialLines.find(l => l.id === lineId);
    if (line?.material && quantity) {
      const numQuantity = parseFloat(quantity);
      if (!isNaN(numQuantity) && numQuantity > 0) {
        updateFormDataMaterial(lineId, line.material, numQuantity);
      }
    }
  }, [materialLines, updateFormDataMaterial]);

  const getCostPreview = useCallback(() => {
    if (!formData.laborHours || !formData.skillLevel || !adminSettings) {
      return null;
    }

    try {
      return pricingEngine.calculateProcessCost(formData, adminSettings);
    } catch (error) {
      console.error("PricingEngine Error:", error);
      return null;
    }
  }, [formData, adminSettings]);

  return {
    materialLines,
    handleAddMaterialLine,
    handleRemoveMaterialLine,
    handleMaterialSelect,
    handleQuantityChange,
    getCostPreview
  };
};
