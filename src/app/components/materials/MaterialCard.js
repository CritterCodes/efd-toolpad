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
          {material.karat && (
            <Chip
              label={material.karat}
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
              {formatPrice(material.unitCost)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              per {material.unitType}
            </Typography>
          </Box>
          
          {/* Portion pricing if applicable */}
          {hasPortions(material) && (
            <Typography variant="caption" color="text.secondary" display="block">
              {formatPrice(calculatePortionPrice(material.unitCost, material.portionsPerUnit))} per {material.portionType || 'portion'}
              • {material.portionsPerUnit} {material.portionType || 'portions'} per unit
            </Typography>
          )}
        </Box>

        {/* Compatible metals - condensed */}
        {material.compatibleMetals && material.compatibleMetals.length > 0 && (
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

        {/* Supplier info - minimal */}
        {material.supplier && (
          <Typography variant="caption" color="text.secondary" display="block">
            <BusinessIcon fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
            {material.supplier}
            {material.stuller_item_number && (
              <> (#{material.stuller_item_number})</>
            )}
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
