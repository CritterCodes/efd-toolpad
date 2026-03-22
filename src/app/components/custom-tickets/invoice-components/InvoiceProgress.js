import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  Box,
  CircularProgress,
  Chip,
  LinearProgress
} from '@mui/material';

export default function InvoiceProgress({
  quoteTotal,
  paymentProgress,
  loadingProgress
}) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (!quoteTotal || quoteTotal <= 0) return null;

  return (
    <Card sx={{ mb: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom color="primary">
          Payment Progress
        </Typography>
        
        {loadingProgress && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2" color="text.secondary">
              Loading payment progress...
            </Typography>
          </Box>
        )}
        
        {paymentProgress && (
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">
                Amount Paid
              </Typography>
              <Typography variant="h6" color="success.main">
                {formatCurrency(paymentProgress.totalPaid)}
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">
                Remaining
              </Typography>
              <Typography variant="h6">
                {formatCurrency(paymentProgress.remainingAmount)}
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">
                Progress
              </Typography>
              <Typography variant="h6" color="primary.main">
                {paymentProgress.paymentProgress}%
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Chip 
                label={paymentProgress.status?.hasReached50Percent ? 'Production Ready' : 'Awaiting Payment'} 
                color={paymentProgress.status?.hasReached50Percent ? 'success' : 'warning'}
                size="small"
              />
            </Grid>
            <Grid item xs={12}>
              <LinearProgress 
                variant="determinate" 
                value={paymentProgress.paymentProgress || 0} 
                sx={{ mt: 1, height: 8, borderRadius: 4 }}
              />
            </Grid>
          </Grid>
        )}

        {!loadingProgress && !paymentProgress && (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            No payment data available yet
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}