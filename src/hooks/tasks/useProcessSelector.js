import { useState, useMemo } from 'react';
import { PricingService } from '../../services/PricingService';

export function useProcessSelector({ availableProcesses, selectedProcesses, onProcessesChange, maxSelection, currentMetalContext }) {
  const [expandedProcess, setExpandedProcess] = useState(null);

  const processAnalysis = useMemo(() => {
    return availableProcesses.map(process => {
      const isSelected = selectedProcesses.some(sp => sp.processId === process._id);
      const selectionData = selectedProcesses.find(sp => sp.processId === process._id);
      const quantity = selectionData?.quantity || 1;

      // Get pricing stats for this process
      const pricingStats = process.pricing ? 
        PricingService.calculatePricingStats(process.pricing) : null;

      // Get price for current metal context
      const currentPrice = process.pricing ?
        PricingService.getPriceForMetal(
          process.pricing,
          currentMetalContext.metalType,
          currentMetalContext.karat
        ) : null;

      return {
        ...process,
        isSelected,
        quantity,
        pricingStats,
        currentPrice,
        totalCurrentPrice: currentPrice ? currentPrice * quantity : null,
        isCurrentMetalSupported: currentPrice !== null
      };
    });
  }, [availableProcesses, selectedProcesses, currentMetalContext]);

  const totalImpact = useMemo(() => {
    const selectedAnalysis = processAnalysis.filter(p => p.isSelected);
    
    if (selectedAnalysis.length === 0) {
      return {
        totalCurrentPrice: 0,
        supportedCount: 0,
        unsupportedCount: 0,
        priceRange: null
      };
    }

    const totalCurrentPrice = selectedAnalysis.reduce((sum, process) => {
      return sum + (process.totalCurrentPrice || 0);
    }, 0);

    const supportedCount = selectedAnalysis.filter(p => p.isCurrentMetalSupported).length;
    const unsupportedCount = selectedAnalysis.length - supportedCount;

    const allPrices = selectedAnalysis
      .filter(p => p.pricingStats)
      .map(p => ({
        min: p.pricingStats.min * p.quantity,
        max: p.pricingStats.max * p.quantity
      }));

    const priceRange = allPrices.length > 0 ? {
      min: allPrices.reduce((sum, p) => sum + p.min, 0),
      max: allPrices.reduce((sum, p) => sum + p.max, 0)
    } : null;

    return {
      totalCurrentPrice,
      supportedCount,
      unsupportedCount,
      priceRange
    };
  }, [processAnalysis]);

  const handleProcessToggle = (process) => {
    if (process.isSelected) {
      const newSelection = selectedProcesses.filter(sp => sp.processId !== process._id);
      onProcessesChange(newSelection);
    } else {
      if (maxSelection && selectedProcesses.length >= maxSelection) {
        return;
      }
      
      const newSelection = [...selectedProcesses, {
        processId: process._id,
        quantity: 1
      }];
      onProcessesChange(newSelection);
    }
  };

  const handleQuantityChange = (processId, newQuantity) => {
    if (newQuantity < 1) {
      const newSelection = selectedProcesses.filter(sp => sp.processId !== processId);
      onProcessesChange(newSelection);
      return;
    }

    const newSelection = selectedProcesses.map(sp => 
      sp.processId === processId 
        ? { ...sp, quantity: newQuantity }
        : sp
    );
    onProcessesChange(newSelection);
  };

  return {
    expandedProcess,
    setExpandedProcess,
    processAnalysis,
    totalImpact,
    handleProcessToggle,
    handleQuantityChange
  };
}
