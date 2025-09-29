/**
 * Pricing Breakdown Component
 * Displays calculated pricing totals - Constitutional Architecture
 */

import React from 'react';
import {
  Grid,
  Typography,
  Box,
  Divider
} from '@mui/material';

export function PricingBreakdown({ totals }) {
  const formatCurrency = (amount) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const breakdownItems = [
    { label: 'Materials', value: totals.materials, color: 'text.primary' },
    { label: 'Labor', value: totals.labor, color: 'text.primary' },
    { label: 'Casting', value: totals.casting, color: 'text.primary' },
    { label: 'Shipping', value: totals.shipping, color: 'text.primary' },
    { label: 'Design Fee', value: totals.design, color: 'text.primary' }
  ].filter(item => item.value > 0);

  return (
    <Box>
      <Divider sx={{ my: 2 }} />
      
      <Typography variant="subtitle2" gutterBottom>
        Pricing Breakdown
      </Typography>
      
      {/* Breakdown Items */}
      {breakdownItems.length > 0 && (
        <Box sx={{ mb: 2 }}>
          {breakdownItems.map((item, index) => (
            <Box 
              key={item.label}
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                py: 0.5
              }}
            >
              <Typography variant="body2" color="text.secondary">
                {item.label}
              </Typography>
              <Typography variant="body2" color={item.color}>
                {formatCurrency(item.value)}
              </Typography>
            </Box>
          ))}
          
          <Divider sx={{ my: 1 }} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
            <Typography variant="body2" fontWeight="medium">
              Subtotal
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {formatCurrency(totals.subtotal)}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
            <Typography variant="body2" color="success.main">
              Markup (40%)
            </Typography>
            <Typography variant="body2" color="success.main">
              {formatCurrency(totals.markup)}
            </Typography>
          </Box>
        </Box>
      )}
      
      {/* Summary Cards */}
      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">Materials</Typography>
            <Typography variant="h6">{formatCurrency(totals.materials)}</Typography>
          </Box>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">Labor</Typography>
            <Typography variant="h6">{formatCurrency(totals.labor)}</Typography>
          </Box>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">Markup (40%)</Typography>
            <Typography variant="h6" color="success.main">{formatCurrency(totals.markup)}</Typography>
          </Box>
        </Grid>
        
        <Grid item xs={6} sm={3}>
          <Box sx={{ textAlign: 'center', p: 1, bgcolor: 'primary.main', color: 'white', borderRadius: 1 }}>
            <Typography variant="body2">Total Quote</Typography>
            <Typography variant="h5" fontWeight="bold">{formatCurrency(totals.total)}</Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}

export default PricingBreakdown;