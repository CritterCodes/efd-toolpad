import React from 'react';
import { Card, CardContent, Typography, Grid, Alert } from '@mui/material';
import { PricingService } from '../../../services/PricingService';

export function ProcessSummaryCard({ totalImpact, selectedProcesses, getCurrentDisplayName }) {
  if (selectedProcesses.length === 0) return null;

  return (
    <Card sx={{ mb: 2, bgcolor: 'primary.light' }}>
      <CardContent>
        <Typography variant="h6" color="primary.contrastText" gutterBottom>
          Selected Processes Impact
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" color="primary.contrastText">
              {getCurrentDisplayName()} Total:
            </Typography>
            <Typography variant="h5" color="primary.contrastText" fontWeight="bold">
              {PricingService.formatPrice(totalImpact.totalCurrentPrice)}
            </Typography>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" color="primary.contrastText">
              Processes Selected:
            </Typography>
            <Typography variant="h5" color="primary.contrastText" fontWeight="bold">
              {selectedProcesses.length}
            </Typography>
          </Grid>

          {totalImpact.priceRange && (
            <>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="primary.contrastText">
                  Min Total:
                </Typography>
                <Typography variant="h6" color="primary.contrastText">
                  {PricingService.formatPrice(totalImpact.priceRange.min)}
                </Typography>
              </Grid>
              
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" color="primary.contrastText">
                  Max Total:
                </Typography>
                <Typography variant="h6" color="primary.contrastText">
                  {PricingService.formatPrice(totalImpact.priceRange.max)}
                </Typography>
              </Grid>
            </>
          )}
        </Grid>

        {totalImpact.unsupportedCount > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {totalImpact.unsupportedCount} selected process(es) don&apos;t support {getCurrentDisplayName()}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
