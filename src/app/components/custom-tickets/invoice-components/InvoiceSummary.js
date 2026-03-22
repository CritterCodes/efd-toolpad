import React from 'react';
import { Card, CardContent, Typography, Grid } from '@mui/material';

export default function InvoiceSummary({ quoteTotal, suggestedDepositAmount }) {
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
          Quote Summary
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Total Quote Amount
            </Typography>
            <Typography variant="h6">
              {formatCurrency(quoteTotal)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Suggested Deposit (50%)
            </Typography>
            <Typography variant="h6" color="success.main">
              {formatCurrency(suggestedDepositAmount)}
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}