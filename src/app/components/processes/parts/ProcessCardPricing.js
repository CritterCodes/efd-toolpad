import React from 'react';
import { Box, Typography } from '@mui/material';
import { Schedule as TimeIcon, AttachMoney as MoneyIcon } from '@mui/icons-material';
import { formatPrice, formatMetalTypeDisplay, getKaratLabel } from '@/utils/processes.util';

export const ProcessCardPricing = ({ process, isMultiVariant, priceRange, costData }) => {
  return (
    <Box>
      {/* Time and Cost */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box display="flex" alignItems="center" gap={0.5}>
          <TimeIcon fontSize="small" color="action" />
          <Typography variant="body2" color="text.secondary">
            {process.laborHours} hrs
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={0.5}>
          <MoneyIcon fontSize="small" color="success" />
          <Typography variant="body2" color="success.main" fontWeight="bold">
            {isMultiVariant && priceRange ? 
              `${formatPrice(priceRange.min)} - ${formatPrice(priceRange.max)}` :
              formatPrice(costData?.totalCost || 0)
            }
          </Typography>
          {isMultiVariant && (
            <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              (varies by metal)
            </Typography>
          )}
        </Box>
      </Box>

      {/* Metal Information and Cost Breakdown */}
      {(process.metalType || isMultiVariant) && (
        <Box mb={2}>
          {process.metalType ? (
            <Typography variant="caption" color="text.secondary" display="block">
              Metal: {formatMetalTypeDisplay(process.metalType)}
              {process.karat && ` (${getKaratLabel(process.karat, process.metalType)})`} 
              - Complexity: {process.metalComplexityMultiplier || 1.0}x
            </Typography>
          ) : isMultiVariant ? (
            <Typography variant="caption" color="text.secondary" display="block">
              Universal Process - Price varies by metal type and karat
            </Typography>
          ) : null}
          
          {!isMultiVariant && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              Labor: {formatPrice(costData.laborCost)} + Materials: {formatPrice(costData.materialsCost)}
              {costData.materialMarkup !== 1.0 && ` (${((costData.materialMarkup - 1) * 100).toFixed(0)}% markup)`}
              {costData.complexityMultiplier !== 1.0 && ` × ${costData.complexityMultiplier}`}
            </Typography>
          )}
          
          {isMultiVariant && (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              Base: {formatPrice(costData.laborCost)} labor + materials (adjusted per metal type)
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};
