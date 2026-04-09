import React from 'react';
import { Box, Typography } from '@mui/material';
import { formatPrice, hasPortions, calculatePortionPrice } from '@/utils/materials.util';

export default function MaterialPriceSection({ material, isMetalDependent }) {
  const getPriceDisplay = () => {
    if (!isMetalDependent) {
      if (material.stullerProducts && material.stullerProducts.length > 0) {
        const unitCosts = material.stullerProducts
          .map(p => parseFloat(p.stullerPrice) || 0)
          .filter(price => price > 0);
          
        if (unitCosts.length > 0) {
          const min = Math.min(...unitCosts);
          const max = Math.max(...unitCosts);
          return min === max ? formatPrice(min) : `${formatPrice(min)} - ${formatPrice(max)}`;
        }
      }
      return material.unitCost ? formatPrice(material.unitCost) : 'No price set';
    }

    if (!material.stullerProducts || material.stullerProducts.length === 0) {
      return material.unitCost ? formatPrice(material.unitCost) : 'No price';
    }

    const unitCosts = material.stullerProducts
      .map(p => parseFloat(p.stullerPrice) || 0)
      .filter(price => price > 0);
    
    if (unitCosts.length === 0) {
      return 'No pricing data';
    }

    const unitMin = Math.min(...unitCosts);
    const unitMax = Math.max(...unitCosts);
    
    return unitMin === unitMax ? 
      formatPrice(unitMin) :
      `${formatPrice(unitMin)} - ${formatPrice(unitMax)}`;
  };

  const getPortionDisplay = () => {
    if (!isMetalDependent) {
      if (material.stullerProducts && material.stullerProducts.length > 0) {
        const portionCosts = material.stullerProducts
          .map(p => parseFloat(p.costPerPortion) || 0)
          .filter(price => price > 0);
        
        if (portionCosts.length > 0) {
          const min = Math.min(...portionCosts);
          const max = Math.max(...portionCosts);
          const portionType = material.portionType || 'portion';
          return min === max ? 
            `${formatPrice(min)} cost per ${portionType}` :
            `${formatPrice(min)}-${formatPrice(max)} cost per ${portionType}`;
        }
      }
      return material.unitCost ? `${formatPrice(calculatePortionPrice(material.unitCost, material.portionsPerUnit))} per ${material.portionType || 'portion'}` : 'No price set';
    } else {
      if (material.stullerProducts && material.stullerProducts.length > 0) {
        const portionCosts = material.stullerProducts
          .map(p => parseFloat(p.costPerPortion) || 0)
          .filter(price => price > 0);
        
        if (portionCosts.length > 0) {
          const min = Math.min(...portionCosts);
          const max = Math.max(...portionCosts);
          const portionType = material.portionType || 'piece';
          return min === max ? 
            `${formatPrice(min)} cost per ${portionType}` :
            `${formatPrice(min)}-${formatPrice(max)} cost per ${portionType}`;
        }
      }
      return 'No portion pricing';
    }
  };

  return (
    <Box mb={1.5}>
      <Box display="flex" alignItems="baseline" gap={1} mb={0.5}>
        <Typography variant="h5" color="success.main" fontWeight="medium">
          {getPriceDisplay()}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          per {material.unitType}
        </Typography>
      </Box>
      
      {hasPortions(material) && (
        <Typography variant="caption" color="text.secondary" display="block">
          {getPortionDisplay()} • {material.portionsPerUnit} {material.portionType || 'portions'} per unit
        </Typography>
      )}
    </Box>
  );
}
