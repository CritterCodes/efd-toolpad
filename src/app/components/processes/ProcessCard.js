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
  // Calculate process cost with admin settings
  const costBreakdown = calculateProcessCost(process, adminSettings);
  
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
              {formatPrice(costBreakdown.totalCost)}
            </Typography>
          </Box>
        </Box>

        {/* Metal Information and Cost Breakdown */}
        {process.metalType && (
          <Box mb={2}>
            <Typography variant="caption" color="text.secondary" display="block">
              Metal: {formatMetalTypeDisplay(process.metalType)}
              {process.karat && ` (${getKaratLabel(process.karat, process.metalType)})`} 
              - Complexity: {process.metalComplexityMultiplier || 1.0}x
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              Labor: {formatPrice(costBreakdown.laborCost)} + Materials: {formatPrice(costBreakdown.materialsCost)}
              {costBreakdown.materialMarkup !== 1.0 && ` (${((costBreakdown.materialMarkup - 1) * 100).toFixed(0)}% markup)`}
              {costBreakdown.complexityMultiplier !== 1.0 && ` × ${costBreakdown.complexityMultiplier}`}
            </Typography>
          </Box>
        )}

        {/* Materials Required */}
        <Box>
          <Typography variant="caption" color="text.secondary" display="block">
            Materials Required:
          </Typography>
          {process.materials && process.materials.length > 0 ? (
            <Box display="flex" gap={0.5} flexWrap="wrap">
              {process.materials.slice(0, 3).map((material, index) => (
                <Chip
                  key={index}
                  label={`${material.materialName}: ${material.quantity} ${material.unit}${material.quantity !== 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              ))}
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
