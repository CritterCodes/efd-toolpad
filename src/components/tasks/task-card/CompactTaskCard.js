import React from 'react';
import { Card, CardContent, Typography, Grid, Chip, Box } from '@mui/material';
import { useTaskCard } from '../../../hooks/tasks/useTaskCard';

export function CompactTaskCard({ task, onSelect, selected = false }) {
  const {
    currentPrice,
    pricingStats,
    formatPrice
  } = useTaskCard(task);

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
                {formatPrice(currentPrice)}
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