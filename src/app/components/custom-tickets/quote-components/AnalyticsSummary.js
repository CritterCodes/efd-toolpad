import React from 'react';
import { Card, CardContent, CardHeader, Typography, Box, Divider } from '@mui/material';

export function AnalyticsSummary({ analytics }) {
  const marginColor = analytics.belowMarginFloor ? 'error.main' : 'text.primary';
  return (
    <Card>
      <CardHeader title="Analytics" />
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>Cost Breakdown</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">COG (materials + labor):</Typography>
            <Typography variant="body2">${analytics.cog?.toFixed(2) || '0.00'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Total Cost (incl. design payout, shipping):</Typography>
            <Typography variant="body2">${analytics.totalCost?.toFixed(2) || '0.00'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="success.main">Gross Profit:</Typography>
            <Typography variant="body2" color="success.main">${analytics.grossProfit?.toFixed(2) || '0.00'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2">Gross Margin:</Typography>
            <Typography variant="body2" color={marginColor} fontWeight={analytics.belowMarginFloor ? 'bold' : 'regular'}>
              {analytics.grossMargin?.toFixed(1) || '0.0'}%
              {analytics.belowMarginFloor ? ` (below ${analytics.targetMarginFloor?.toFixed(0)}% floor)` : ''}
            </Typography>
          </Box>

          <Divider sx={{ my: 1 }} />
          <Typography variant="body2" color="text.secondary" gutterBottom>Payouts</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Designer Payout:</Typography>
            <Typography variant="body2">${analytics.designPayout?.toFixed(2) || '0.00'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Commission ({((analytics.commissionPercentage || 0) * 100).toFixed(0)}% of profit):</Typography>
            <Typography variant="body2">${analytics.commissionPayout?.toFixed(2) || '0.00'}</Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" fontWeight="bold">Net Profit:</Typography>
            <Typography variant="body2" fontWeight="bold" color="success.main">
              ${analytics.netProfit?.toFixed(2) || '0.00'}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default AnalyticsSummary;