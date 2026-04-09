import { useState } from 'react';
import { useMetalContext } from '../../contexts/MetalContextProvider';
import { PricingService } from '../../services/PricingService';

export function useTaskCard(task) {
  const [expanded, setExpanded] = useState(false);
  const { currentMetalContext, getCurrentDisplayName } = useMetalContext();

  const handleToggleExpand = (e) => {
    if (e) {
      e.stopPropagation();
    }
    setExpanded((prev) => !prev);
  };

  const pricingStats = task?.pricing 
    ? PricingService.calculatePricingStats(task.pricing) 
    : null;

  const currentPrice = task?.pricing && currentMetalContext
    ? PricingService.getPriceForMetal(
        task.pricing, 
        currentMetalContext.metalType, 
        currentMetalContext.karat
      ) 
    : null;

  const isCurrentMetalSupported = currentPrice !== null;
  const currentMetalKey = currentMetalContext 
    ? `${currentMetalContext.metalType}_${currentMetalContext.karat}` 
    : '';

  return {
    expanded,
    setExpanded,
    handleToggleExpand,
    currentMetalContext,
    getCurrentDisplayName,
    pricingStats,
    currentPrice,
    isCurrentMetalSupported,
    currentMetalKey,
    formatPrice: PricingService.formatPrice
  };
}