import React from 'react';
import { Card, CardContent, CardHeader, Typography, Box, Divider } from '@mui/material';

export function AnalyticsSummary({ analytics }) {
  return (
    <Card>
      <CardHeader title="Analytics" />
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>Cost Breakdown</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">COG (Cost of Goods):</Typography>
            <Typography variant="body2">${analytics.cog?.toFixed(2) || '0.00'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="success.main">Gross Profit:</Typography>
            <Typography variant="body2" color="success.main">${analytics.profit?.toFixed(2) || '0.00'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="body2">Gross Margin:</Typography>
            <Typography variant="body2">{analytics.grossMargin?.toFixed(1) || '0.0'}%</Typography>
          </Box>

          <Divider sx={{ my: 1 }} />
          <Typography variant="body2" color="text.secondary" gutterBottom>Payouts</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Jeweler Payout:</Typography>
            <Typography variant="body2">${analytics.jewelerPayout?.toFixed(2) || '0.00'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">CAD Designer:</Typography>
            <Typography variant="body2">${analytics.cadDesignerPayout?.toFixed(2) || '0.00'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Commission:</Typography>
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