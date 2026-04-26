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
  getMetalLabel
} from '@/utils/materials.util';
import { getPriceRange } from '@/utils/material-pricing.util';

export default function MaterialCard({
  material,
  onEdit,
  onDelete
}) {
  const handleEdit = () => onEdit(material);
  const handleDelete = () => onDelete(material);

  const getVariantCount = () => material.stullerProducts?.length || 0;
  const isMetalDependent = () => material.isMetalDependent !== false;

  const getPriceDisplay = () => {
    if (!isMetalDependent()) {
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

  const getMetalKaratCombinations = () => {
    if (!material.stullerProducts?.length) {
      return [];
    }

    return material.stullerProducts.map((product) => ({
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
          ) : getVariantCount() > 0 ? (
            <Chip
              label={`${getVariantCount()} variant${getVariantCount() > 1 ? 's' : ''}`}
              variant="filled"
              size="small"
              color="primary"
              sx={{ fontWeight: 'medium', fontSize: '0.75rem' }}
            />
          ) : null}
        </Box>

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

        {isMetalDependent() && getVariantCount() > 0 && (
          <Box mb={1}>
            <Box display="flex" gap={0.5} flexWrap="wrap">
              {getMetalKaratCombinations().slice(0, 3).map((combo, index) => (
                <Chip
                  key={`${combo.metal}-${combo.karat}-${index}`}
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

        {isMetalDependent() && getVariantCount() === 0 && material.compatibleMetals?.length > 0 && (
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
        <IconButton size="small" onClick={handleEdit} aria-label={`Edit ${material.displayName}`}>
          <EditIcon />
        </IconButton>
        <IconButton size="small" color="error" onClick={handleDelete} aria-label={`Delete ${material.displayName}`}>
          <DeleteIcon />
        </IconButton>
      </CardActions>
    </Card>
  );
}
