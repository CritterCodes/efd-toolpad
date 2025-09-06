/**
 * MaterialCard Component
 * Displays individual material information in a card format
 */

import * as React from 'react';
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
  Business as BusinessIcon
} from '@mui/icons-material';
import {
  formatPrice,
  hasPortions,
  calculatePortionPrice,
  getMetalLabel
} from '@/utils/materials.util';
import { 
  getPriceRange, 
  getCostPerPortion, 
  getPricePerPortion 
} from '@/utils/material-pricing.util';

export default function MaterialCard({ 
  material, 
  onEdit, 
  onDelete,
  metalOptions = [] 
}) {
  const handleEdit = () => {
    onEdit(material);
  };

  const handleDelete = () => {
    onDelete(material);
  };

  // Helper functions for multi-variant materials
  const getVariantCount = () => {
    return material.stullerProducts?.length || 0;
  };

  const isMetalDependent = () => {
    return material.isMetalDependent !== false;
  };

  const getPriceDisplay = () => {
    // For non-metal dependent materials, show unit price from Stuller products or unitCost
    if (!isMetalDependent()) {
      if (material.stullerProducts && material.stullerProducts.length > 0) {
        // For non-metal-dependent, show the actual stullerPrice (unit cost), not portion cost
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

    // For metal dependent materials, show ONLY unit cost range (stullerPrice)
    if (!material.stullerProducts || material.stullerProducts.length === 0) {
      return material.unitCost ? formatPrice(material.unitCost) : 'No price';
    }

    // Get unit cost range (stullerPrice - what we pay Stuller for the full unit)
    const unitCosts = material.stullerProducts
      .map(p => parseFloat(p.stullerPrice) || 0)
      .filter(price => price > 0);
    
    if (unitCosts.length === 0) {
      return 'No pricing data';
    }

    const unitMin = Math.min(...unitCosts);
    const unitMax = Math.max(...unitCosts);
    
    // Show ONLY unit cost range in main display
    return unitMin === unitMax ? 
      formatPrice(unitMin) :
      `${formatPrice(unitMin)} - ${formatPrice(unitMax)}`;
  };

  const getMetalKaratCombinations = () => {
    if (!material.stullerProducts || material.stullerProducts.length === 0) {
      return [];
    }

    return material.stullerProducts.map(product => ({
      metal: product.metalType ? getMetalLabel(product.metalType) : 'N/A',
      karat: product.karat || 'N/A'
    }));
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        opacity: material.isActive === false ? 0.7 : 1,
        borderLeft: material.isActive === false ? 1 : 3,
        borderLeftColor: material.isActive === false ? 'grey.300' : 'primary.main'
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: 2 }}>
        {/* Header with name and status */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
          <Typography variant="h6" component="h2" sx={{ flexGrow: 1, mr: 1, lineHeight: 1.2 }}>
            {material.displayName}
          </Typography>
          <Chip
            label={material.isActive === false ? 'Inactive' : 'Active'}
            color={material.isActive === false ? 'default' : 'success'}
            size="small"
          />
        </Box>

        {/* Primary info chips */}
        <Box display="flex" gap={0.5} flexWrap="wrap" mb={1.5}>
          <Chip
            label={material.category}
            variant="outlined"
            size="small"
            icon={<CategoryIcon />}
            sx={{ fontSize: '0.75rem' }}
          />
          {!isMetalDependent() ? (
            <Chip
              label="Universal"
              variant="filled"
              size="small"
              color="secondary"
              sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}
            />
          ) : getVariantCount() > 0 && (
            <Chip
              label={`${getVariantCount()} variant${getVariantCount() > 1 ? 's' : ''}`}
              variant="filled"
              size="small"
              color="primary"
              sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}
            />
          )}
        </Box>

        {/* Price section */}
        <Box mb={1.5}>
          <Box display="flex" alignItems="baseline" gap={1} mb={0.5}>
            <Typography variant="h5" color="success.main" fontWeight="medium">
              {getPriceDisplay()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              per {material.unitType}
            </Typography>
          </Box>
          
          {/* Portion pricing info - show for all materials that have portions */}
          {hasPortions(material) && (
            <Typography variant="caption" color="text.secondary" display="block">
              {!isMetalDependent() ? 
                // Non-metal dependent: check for stullerProducts first, then fall back to unitCost
                (() => {
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
                  // Fall back to calculating from unitCost
                  return material.unitCost ? `${formatPrice(calculatePortionPrice(material.unitCost, material.portionsPerUnit))} per ${material.portionType || 'portion'}` : 'No price set';
                })() :
                // Metal dependent: show portion cost range from stullerProducts
                (() => {
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
                })()
              }
              • {material.portionsPerUnit} {material.portionType || 'portions'} per unit
            </Typography>
          )}
        </Box>

        {/* Metal/Karat combinations for multi-variant materials */}
        {isMetalDependent() && getVariantCount() > 0 && (
          <Box mb={1}>
            <Box display="flex" gap={0.5} flexWrap="wrap">
              {getMetalKaratCombinations().slice(0, 3).map((combo, index) => (
                <Chip
                  key={index}
                  label={`${combo.metal} ${combo.karat}`}
                  size="small"
                  variant="outlined"
                  color="info"
                  sx={{ fontSize: '0.7rem' }}
                />
              ))}
              {getVariantCount() > 3 && (
                <Chip
                  label={`+${getVariantCount() - 3} more`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
            </Box>
          </Box>
        )}

        {/* Universal material indicator */}
        {!isMetalDependent() && (
          <Box mb={1}>
            <Chip
              label="Works with all metal types"
              size="small"
              variant="outlined"
              color="secondary"
              sx={{ fontSize: '0.7rem' }}
            />
          </Box>
        )}

        {/* Legacy compatible metals - only show if no stullerProducts and metal dependent */}
        {isMetalDependent() && getVariantCount() === 0 && material.compatibleMetals && material.compatibleMetals.length > 0 && (
          <Box mb={1}>
            <Box display="flex" gap={0.5} flexWrap="wrap">
              {material.compatibleMetals.slice(0, 3).map((metal) => (
                <Chip
                  key={metal}
                  label={getMetalLabel(metal)}
                  size="small"
                  variant="outlined"
                  color="info"
                  sx={{ fontSize: '0.7rem' }}
                />
              ))}
              {material.compatibleMetals.length > 3 && (
                <Chip
                  label={`+${material.compatibleMetals.length - 3} more`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              )}
            </Box>
          </Box>
        )}

        {/* Supplier info - enhanced for multi-variant */}
        {material.supplier && (
          <Typography variant="caption" color="text.secondary" display="block">
            <BusinessIcon fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
            {material.supplier}
            {!isMetalDependent() ? (
              <> (Universal material)</>
            ) : getVariantCount() > 0 ? (
              <> ({getVariantCount()} Stuller product{getVariantCount() > 1 ? 's' : ''})</>
            ) : material.stuller_item_number ? (
              <> (#{material.stuller_item_number})</>
            ) : null}
          </Typography>
        )}
      </CardContent>

      <CardActions>
        <IconButton
          size="small"
          onClick={handleEdit}
          aria-label={`Edit ${material.displayName}`}
        >
          <EditIcon />
        </IconButton>
        <IconButton
          size="small"
          color="error"
          onClick={handleDelete}
          aria-label={`Delete ${material.displayName}`}
        >
          <DeleteIcon />
        </IconButton>
      </CardActions>
    </Card>
  );
}
