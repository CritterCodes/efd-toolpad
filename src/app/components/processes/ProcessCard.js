'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  IconButton
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Category as CategoryIcon,
  Engineering as EngineeringIcon,
  Schedule as TimeIcon,
  AttachMoney as MoneyIcon
} from '@mui/icons-material';
import {
  formatPrice,
  formatCategoryDisplay,
  formatSkillLevelDisplay,
  formatMetalTypeDisplay,
  getKaratLabel
} from '@/utils/processes.util';
import { SKILL_LEVEL } from '@/constants/pricing.constants.mjs';

/**
 * ProcessCard Component
 * Displays individual process information in a card format
 */
export const ProcessCard = ({
  process,
  onEdit,
  onDelete,
  adminSettings = null
}) => {
  // `process.pricing` is LIVE — THE engine's, attached by the processes API on every read (never a stored
  // snapshot). Per metal when the materials depend on metal: the card shows the range.
  const pricing = process.pricing || null;
  const byMetal = pricing && typeof pricing.totalCost === 'object' && pricing.totalCost !== null;
  const totals = byMetal ? Object.values(pricing.totalCost) : [];
  const materialsByMetal = byMetal && typeof pricing.materialsCost === 'object' ? Object.values(pricing.materialsCost) : [];
  const isMultiVariant = totals.length > 1;
  const priceRange = isMultiVariant ? { min: Math.min(...totals), max: Math.max(...totals) } : null;
  const costData = {
    totalCost: byMetal ? (totals.length ? Math.min(...totals) : 0) : (pricing?.totalCost || 0),
    laborCost: pricing?.laborCost || 0,
    materialsCost: byMetal ? (materialsByMetal.length ? Math.min(...materialsByMetal) : 0) : (pricing?.materialsCost || 0),
    materialMarkup: 1.0,
    complexityMultiplier: 1.0,
  };

  // Get skill level color
  const getSkillColor = (skillLevel) => {
    switch (skillLevel) {
      case SKILL_LEVEL.BASIC: return 'default';
      case SKILL_LEVEL.STANDARD: return 'primary';
      case SKILL_LEVEL.ADVANCED: return 'warning';
      case SKILL_LEVEL.EXPERT: return 'error';
      default: return 'primary';
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        opacity: process.isActive === false ? 0.7 : 1,
        borderLeft: process.isActive === false ? 1 : 3,
        borderLeftColor: process.isActive === false ? 'grey.300' : 'primary.main'
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        {/* Header with name and status */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Typography variant="h6" component="h2" noWrap sx={{ flexGrow: 1, mr: 1 }}>
            {process.displayName}
          </Typography>
          <Chip
            label={process.isActive === false ? 'Inactive' : 'Active'}
            color={process.isActive === false ? 'default' : 'success'}
            size="small"
          />
        </Box>

        {/* Description */}
        <Typography color="text.secondary" variant="body2" sx={{ mb: 2 }}>
          {process.description || 'No description'}
        </Typography>

        {/* Category and Skill Level Chips */}
        <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
          <Chip
            label={formatCategoryDisplay(process.category)}
            variant="outlined"
            size="small"
            icon={<CategoryIcon />}
          />
          <Chip
            label={formatSkillLevelDisplay(process.skillLevel)}
            variant="outlined"
            size="small"
            color={getSkillColor(process.skillLevel)}
            icon={<EngineeringIcon />}
          />
        </Box>

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
            {pricing ? (
              <Typography variant="body2" color="success.main" fontWeight="bold">
                {isMultiVariant && priceRange ?
                  `${formatPrice(priceRange.min)} - ${formatPrice(priceRange.max)}` :
                  formatPrice(costData.totalCost)
                }
              </Typography>
            ) : (
              /* Can't be priced (or pricing didn't load): the reason, never $0.00. */
              <Typography variant="caption" color="error">
                {process.pricingMessage || "Can't price"}
              </Typography>
            )}
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

        {/* Materials Required */}
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Materials Required:
          </Typography>
          {process.materials && process.materials.length > 0 ? (
            <Box display="flex" gap={0.5} flexWrap="wrap">
              {process.materials.slice(0, 3).map((material, index) => {
                // Handle both old and new material structure
                const materialName = material.materialName || material.name || 'Unknown Material';
                const quantity = material.quantity || 0;
                const unit = material.unit || 'unit';
                
                return (
                  <Chip
                    key={index}
                    label={`${materialName}: ${quantity} ${unit}${quantity !== 1 ? 's' : ''}`}
                    size="small"
                    variant="outlined"
                    color="primary"
                  />
                );
              })}
              {process.materials.length > 3 && (
                <Chip
                  label={`+${process.materials.length - 3} more`}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              )}
            </Box>
          ) : (
            <Chip
              label="No materials (Labor-only)"
              size="small"
              variant="outlined"
              color="default"
            />
          )}
        </Box>
      </CardContent>

      <CardActions>
        <IconButton
          size="small"
          onClick={() => onEdit(process)}
          title="Edit Process"
        >
          <EditIcon />
        </IconButton>
        <IconButton
          size="small"
          color="error"
          onClick={() => onDelete(process)}
          title="Delete Process"
        >
          <DeleteIcon />
        </IconButton>
      </CardActions>
    </Card>
  );
};
