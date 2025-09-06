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
  getKaratLabel,
  calculateProcessCost
} from '@/utils/processes.util';

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
  // Use stored pricing data if available, otherwise calculate on-the-fly
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
  const costBreakdown = hasMultiVariantMaterials && !process.pricing ? calculateProcessCost(process, adminSettings) : null;
  
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
  
  // Get skill level color
  const getSkillColor = (skillLevel) => {
    switch (skillLevel) {
      case 'basic': return 'default';
      case 'standard': return 'primary';
      case 'advanced': return 'warning';
      case 'expert': return 'error';
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
