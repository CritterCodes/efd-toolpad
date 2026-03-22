import React from 'react';
import { Card, CardContent, Typography, Box, Grid, Chip, IconButton, Tooltip } from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon, Info as InfoIcon } from '@mui/icons-material';
import { PricingService } from '../../../services/PricingService';

export function ProcessItemCard({
  process,
  expandedProcess,
  setExpandedProcess,
  handleQuantityChange,
  handleProcessToggle,
  maxSelection,
  selectedProcesses,
  getCurrentDisplayName,
  currentMetalContext
}) {
  return (
    <Card 
      sx={{ 
        mb: 2,
        border: process.isSelected ? '2px solid' : '1px solid',
        borderColor: process.isSelected ? 'primary.main' : 'divider',
        opacity: process.isCurrentMetalSupported ? 1 : 0.7
      }}
    >
      <CardContent>
        <Grid container spacing={2} alignItems="center">
          {/* Process Info */}
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="h6">
                {process.displayName || process.name}
              </Typography>
              
              {!process.isCurrentMetalSupported && (
                <Chip 
                  label="Not compatible" 
                  size="small" 
                  color="warning" 
                  variant="outlined"
                />
              )}
            </Box>
            
            {process.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {process.description}
              </Typography>
            )}

            {/* Process pricing preview */}
            {process.pricingStats && (
              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                  label={`Range: ${process.pricingStats.formattedMin} - ${process.pricingStats.formattedMax}`}
                  size="small"
                  variant="outlined"
                />
                <Chip 
                  label={`${process.pricingStats.count} metals`}
                  size="small"
                  variant="outlined"
                />
              </Box>
            )}
          </Grid>

          {/* Current Metal Price */}
          <Grid item xs={12} sm={3}>
            {process.isCurrentMetalSupported ? (
              <Box textAlign="center">
                <Typography variant="body2" color="text.secondary">
                  {getCurrentDisplayName()}
                </Typography>
                <Typography variant="h5" color="primary.main" fontWeight="bold">
                  {PricingService.formatPrice(process.currentPrice)}
                </Typography>
                {process.isSelected && process.quantity > 1 && (
                  <Typography variant="body2" color="text.secondary">
                    Total: {PricingService.formatPrice(process.totalCurrentPrice)}
                  </Typography>
                )}
              </Box>
            ) : (
              <Box textAlign="center">
                <Typography variant="h5" color="text.disabled">
                  N/A
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  Not supported
                </Typography>
              </Box>
            )}
          </Grid>

          {/* Actions */}
          <Grid item xs={12} sm={3}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1 }}>
              {process.isSelected ? (
                <>
                  {/* Quantity Controls */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton 
                      size="small"
                      onClick={() => handleQuantityChange(process._id, process.quantity - 1)}
                    >
                      <RemoveIcon />
                    </IconButton>
                    
                    <Typography variant="h6" sx={{ minWidth: 20, textAlign: 'center' }}>
                      {process.quantity}
                    </Typography>
                    
                    <IconButton 
                      size="small"
                      onClick={() => handleQuantityChange(process._id, process.quantity + 1)}
                    >
                      <AddIcon />
                    </IconButton>
                  </Box>
                </>
              ) : (
                <Tooltip title={
                  maxSelection && selectedProcesses.length >= maxSelection 
                    ? `Maximum ${maxSelection} processes allowed`
                    : 'Add this process'
                }>
                  <span>
                    <IconButton 
                      color="primary"
                      disabled={maxSelection && selectedProcesses.length >= maxSelection}
                      onClick={() => handleProcessToggle(process)}
                    >
                      <AddIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              )}

              {/* Process Details */}
              <IconButton 
                size="small"
                onClick={() => setExpandedProcess(
                  expandedProcess === process._id ? null : process._id
                )}
              >
                <InfoIcon />
              </IconButton>
            </Box>
          </Grid>
        </Grid>

        {/* Expanded Details */}
        {expandedProcess === process._id && process.pricingStats && (
          <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" gutterBottom>
              Pricing for All Metal Types:
            </Typography>
            
            <Grid container spacing={1}>
              {process.pricingStats.metalBreakdown.map(metal => (
                <Grid item xs={6} sm={4} md={3} key={metal.metalKey}>
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
                    <Typography variant="caption" display="block">
                      {metal.displayName}
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {metal.formattedPrice}
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>

            {process.laborHours && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Labor Hours: {process.laborHours}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
