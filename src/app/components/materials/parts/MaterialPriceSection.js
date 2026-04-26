import React from 'react';
import { Box, Typography } from '@mui/material';
import { formatPrice, hasPortions } from '@/utils/materials.util';
import { getPriceRange } from '@/utils/material-pricing.util';

export default function MaterialPriceSection({ material, isMetalDependent }) {
  const getPriceDisplay = () => {
    if (!isMetalDependent) {
      if (material.stullerProducts?.length) {
        const unitCosts = material.stullerProducts
          .map((product) => parseFloat(product.stullerPrice) || 0)
          .filter((price) => price > 0);

        if (unitCosts.length > 0) {
          const min = Math.min(...unitCosts);
          const max = Math.max(...unitCosts);
          return min === max ? formatPrice(min) : `${formatPrice(min)} - ${formatPrice(max)}`;
        }
      }

      return material.unitCost ? formatPrice(material.unitCost) : 'No price set';
    }

    if (!material.stullerProducts?.length) {
      return material.unitCost ? formatPrice(material.unitCost) : 'No price';
    }

    const unitCosts = material.stullerProducts
      .map((product) => parseFloat(product.stullerPrice) || 0)
      .filter((price) => price > 0);

    if (unitCosts.length === 0) {
      return 'No pricing data';
    }

    const min = Math.min(...unitCosts);
    const max = Math.max(...unitCosts);
    return min === max ? formatPrice(min) : `${formatPrice(min)} - ${formatPrice(max)}`;
  };

  const getPortionDisplay = () => {
    const portionRange = getPriceRange(material, true);
    if (!portionRange || portionRange.max <= 0) {
      return 'No portion pricing';
    }

    const portionType = material.portionType || 'portion';
    if (portionRange.single !== null && portionRange.single !== undefined) {
      return `${formatPrice(portionRange.single)} cost per ${portionType}`;
    }

    return `${formatPrice(portionRange.min)}-${formatPrice(portionRange.max)} cost per ${portionType}`;
  };

  const getPortionSummary = () => {
    const portionType = material.portionType || 'portions';
    if (!material.stullerProducts?.length) {
      return `${material.portionsPerUnit} ${portionType} per unit`;
    }

    const uniquePortions = [...new Set(
      material.stullerProducts
        .map((product) => Number(product.portionsPerUnit || material.portionsPerUnit || 1))
        .filter((value) => Number.isFinite(value) && value > 0)
    )];

    if (uniquePortions.length === 0) {
      return `${material.portionsPerUnit} ${portionType} per unit`;
    }

    if (uniquePortions.length === 1) {
      return `${uniquePortions[0]} ${portionType} per unit`;
    }

    return `${Math.min(...uniquePortions)}-${Math.max(...uniquePortions)} ${portionType} per unit`;
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
          {getPortionDisplay()} • {getPortionSummary()}
        </Typography>
      )}
    </Box>
  );
}
