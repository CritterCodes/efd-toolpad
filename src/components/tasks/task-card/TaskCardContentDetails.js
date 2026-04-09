import React from 'react';
import { Box, Typography, Grid, Chip } from '@mui/material';

export function TaskCardContentDetails({
  task,
  pricingStats,
  compact,
  currentMetalKey,
  expanded,
  onToggleExpand
}) {
  return (
    <>
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
              color={metal.metalKey === currentMetalKey ? 'primary' : 'default'}
              variant="outlined"
            />
          ))}
          {pricingStats.metalBreakdown.length > 4 && (
            <Chip
              label={`+${pricingStats.metalBreakdown.length - 4} more`}
              size="small"
              variant="outlined"
              onClick={onToggleExpand}
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
    </>
  );
}