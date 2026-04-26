import React from 'react';
import { Card, CardContent, Typography, Grid, Alert } from '@mui/material';
import { PricingService } from '../../../services/PricingService';

export function ProcessSummaryCard({ totalImpact, selectedProcesses, getCurrentDisplayName }) {
  if (selectedProcesses.length === 0) return null;

  return (
    <Card sx={{ mb: 2, bgcolor: '#171A1F', border: '1px solid #2A2F38' }}>
      <CardContent>
        <Typography variant="h6" sx={{ color: '#D1D5DB' }} gutterBottom>
          Selected Processes Impact
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
              {getCurrentDisplayName()} Total:
            </Typography>
            <Typography variant="h5" sx={{ color: '#D4AF37' }} fontWeight="bold">
              {PricingService.formatPrice(totalImpact.totalCurrentPrice)}
            </Typography>
          </Grid>

          <Grid item xs={6} sm={3}>
            <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
              Processes Selected:
            </Typography>
            <Typography variant="h5" sx={{ color: '#D1D5DB' }} fontWeight="bold">
              {selectedProcesses.length}
            </Typography>
          </Grid>

          {totalImpact.priceRange && (
            <>
              <Grid item xs={6} sm={3}>
                <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                  Min Total:
                </Typography>
                <Typography variant="h6" sx={{ color: '#D1D5DB' }}>
                  {PricingService.formatPrice(totalImpact.priceRange.min)}
                </Typography>
              </Grid>

              <Grid item xs={6} sm={3}>
                <Typography variant="body2" sx={{ color: '#9CA3AF' }}>
                  Max Total:
                </Typography>
                <Typography variant="h6" sx={{ color: '#D1D5DB' }}>
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
