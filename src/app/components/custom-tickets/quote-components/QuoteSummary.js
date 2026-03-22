import React from 'react';
import { Card, CardContent, CardHeader, Typography, Box, Divider } from '@mui/material';
import { Calculate as CalculateIcon } from '@mui/icons-material';

export function QuoteSummary({ analytics }) {
  return (
    <Card sx={{ mb: 2 }}>
      <CardHeader 
        title="Quote Summary" 
        avatar={<CalculateIcon color="primary" />}
      />
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Materials:</Typography>
            <Typography variant="body2">${analytics.totalMaterialsRevenue?.toFixed(2) || '0.00'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Labor:</Typography>
            <Typography variant="body2">${analytics.laborRevenue?.toFixed(2) || '0.00'}</Typography>
          </Box>
          {analytics.customDesignFee > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Custom Design:</Typography>
              <Typography variant="body2">${analytics.customDesignFee?.toFixed(2)}</Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Shipping:</Typography>
            <Typography variant="body2">${analytics.totalShippingCost?.toFixed(2) || '0.00'}</Typography>
          </Box>
          {analytics.rushUpcharge > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="warning.main">Rush Surcharge:</Typography>
              <Typography variant="body2" color="warning.main">${analytics.rushUpcharge?.toFixed(2)}</Typography>
            </Box>
          )}
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">Total:</Typography>
            <Typography variant="h6" color="primary">${analytics.total?.toFixed(2) || '0.00'}</Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default QuoteSummary;