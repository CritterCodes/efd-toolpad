/**
 * TaskCard.js - Enhanced task card with universal pricing
 * 
 * Drop-in replacement for existing task cards that shows pricing ranges
 * and metal compatibility while preserving your existing design.
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  Button,
  Collapse,
  IconButton,
  Tooltip,
  Grid,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Info as InfoIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { PricingService } from '../../services/PricingService';
import { MetalContextService } from '../../services/MetalContextService';
import { useMetalContext } from '../../contexts/MetalContextProvider';

export function UniversalTaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  onSelect,
  showActions = true,
  compact = false 
}) {
  const [expanded, setExpanded] = useState(false);
  const { currentMetalContext, getCurrentDisplayName } = useMetalContext();

  // Calculate pricing stats
  const pricingStats = task.pricing ? 
    PricingService.calculatePricingStats(task.pricing) : null;

  // Get price for current metal context
  const currentPrice = task.pricing ? 
    PricingService.getPriceForMetal(
      task.pricing, 
      currentMetalContext.metalType, 
      currentMetalContext.karat
    ) : null;

  const isCurrentMetalSupported = currentPrice !== null;

  return (
    <Card 
      sx={{ 
        mb: 2,
        border: isCurrentMetalSupported ? '2px solid' : '1px solid',
        borderColor: isCurrentMetalSupported ? 'primary.main' : 'divider',
        cursor: onSelect ? 'pointer' : 'default'
      }}
      onClick={onSelect}
    >
      <CardContent>
        {/* Task Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" component="h3">
              {task.name || task.title}
            </Typography>
            
            {task.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {task.description}
              </Typography>
            )}
          </Box>

          {/* Current Metal Context Price */}
          <Box sx={{ textAlign: 'right', minWidth: 120 }}>
            {isCurrentMetalSupported ? (
              <>
                <Typography variant="h5" color="primary.main" fontWeight="bold">
                  {PricingService.formatPrice(currentPrice)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {getCurrentDisplayName()}
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="h5" color="text.disabled">
                  N/A
                </Typography>
                <Typography variant="caption" color="error.main">
                  Not compatible
                </Typography>
              </>
            )}
          </Box>
        </Box>

        {/* Pricing Range Summary */}
        {pricingStats && (
          <Box sx={{ mb: 2 }}>
            <Grid container spacing={1} alignItems="center">
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Price Range:
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {pricingStats.formattedMin} - {pricingStats.formattedMax}
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2" color="text.secondary">
                  Supported Metals:
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {pricingStats.count} combinations
                </Typography>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Metal Compatibility Chips */}
        {!compact && pricingStats && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {pricingStats.metalBreakdown.slice(0, 4).map(metal => (
              <Chip
                key={metal.metalKey}
                label={`${metal.displayName}: ${metal.formattedPrice}`}
                size="small"
                color={metal.metalKey === 
                  `${currentMetalContext.metalType}_${currentMetalContext.karat}` 
                  ? 'primary' : 'default'
                }
                variant="outlined"
              />
            ))}
            {pricingStats.metalBreakdown.length > 4 && (
              <Chip
                label={`+${pricingStats.metalBreakdown.length - 4} more`}
                size="small"
                variant="outlined"
                onClick={() => setExpanded(!expanded)}
              />
            )}
          </Box>
        )}

        {/* Task Details */}
        {task.category && (
          <Box sx={{ mt: 2 }}>
            <Chip 
              label={task.category} 
              size="small" 
              color="secondary" 
              variant="outlined"
            />
            {task.subcategory && (
              <Chip 
                label={task.subcategory} 
                size="small" 
                variant="outlined" 
                sx={{ ml: 0.5 }}
              />
            )}
          </Box>
        )}
      </CardContent>

      {/* Expandable Details */}
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <CardContent sx={{ pt: 0 }}>
          <Divider sx={{ mb: 2 }} />
          
          {/* All Metal Pricing */}
          {pricingStats && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                All Metal Combinations:
              </Typography>
              <Grid container spacing={1}>
                {pricingStats.metalBreakdown.map(metal => (
                  <Grid item xs={6} sm={4} key={metal.metalKey}>
                    <Box 
                      sx={{ 
                        p: 1, 
                        border: 1, 
                        borderColor: 'divider', 
                        borderRadius: 1,
                        bgcolor: metal.metalKey === 
                          `${currentMetalContext.metalType}_${currentMetalContext.karat}` 
                          ? 'primary.light' : 'transparent'
                      }}
                    >
                      <Typography variant="body2" fontWeight="medium">
                        {metal.displayName}
                      </Typography>
                      <Typography variant="h6" color="primary.main">
                        {metal.formattedPrice}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          {/* Service Details */}
          {task.service && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Service Details:
              </Typography>
              <Grid container spacing={2}>
                {task.service.estimatedDays && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Estimated Days: {task.service.estimatedDays}
                    </Typography>
                  </Grid>
                )}
                {task.service.rushDays && (
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Rush Days: {task.service.rushDays}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}

          {/* Process Information */}
          {task.processes && task.processes.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Processes: {task.processes.length} selected
              </Typography>
            </Box>
          )}
        </CardContent>
      </Collapse>

      {/* Actions */}
      {showActions && (
        <CardActions sx={{ justifyContent: 'space-between' }}>
          <Box>
            <IconButton 
              onClick={() => setExpanded(!expanded)}
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            >
              <ExpandMoreIcon />
            </IconButton>
            
            <Tooltip title="Task pricing info">
              <IconButton size="small">
                <InfoIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Box>
            {onEdit && (
              <Button 
                size="small" 
                startIcon={<EditIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
              >
                Edit
              </Button>
            )}
            
            {onDelete && (
              <Button 
                size="small" 
                color="error"
                startIcon={<DeleteIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task);
                }}
              >
                Delete
              </Button>
            )}
          </Box>
        </CardActions>
      )}
    </Card>
  );
}

// Compact version for lists
export function CompactTaskCard({ task, onSelect, selected = false }) {
  const { currentMetalContext } = useMetalContext();
  
  const currentPrice = task.pricing ? 
    PricingService.getPriceForMetal(
      task.pricing, 
      currentMetalContext.metalType, 
      currentMetalContext.karat
    ) : null;

  const pricingStats = task.pricing ? 
    PricingService.calculatePricingStats(task.pricing) : null;

  return (
    <Card 
      sx={{ 
        cursor: 'pointer',
        border: selected ? '2px solid' : '1px solid',
        borderColor: selected ? 'primary.main' : 'divider',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: 2
        }
      }}
      onClick={() => onSelect && onSelect(task)}
    >
      <CardContent sx={{ py: 1.5 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={6}>
            <Typography variant="subtitle1" fontWeight="medium">
              {task.name || task.title}
            </Typography>
            {pricingStats && (
              <Typography variant="caption" color="text.secondary">
                {pricingStats.formattedMin} - {pricingStats.formattedMax}
              </Typography>
            )}
          </Grid>
          
          <Grid item xs={3}>
            {currentPrice !== null ? (
              <Typography variant="h6" color="primary.main" textAlign="center">
                {PricingService.formatPrice(currentPrice)}
              </Typography>
            ) : (
              <Typography variant="h6" color="text.disabled" textAlign="center">
                N/A
              </Typography>
            )}
          </Grid>
          
          <Grid item xs={3}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Chip 
                label={`${pricingStats?.count || 0} metals`}
                size="small"
                color={currentPrice !== null ? 'primary' : 'default'}
                variant="outlined"
              />
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
