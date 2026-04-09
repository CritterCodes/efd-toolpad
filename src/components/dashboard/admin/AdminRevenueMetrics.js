import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

export default function AdminRevenueMetrics({ dashboardMetrics }) {
    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Revenue Metrics
                </Typography>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        Monthly Revenue
                    </Typography>
                    <Typography variant="h5" color="success.main">
                        ${dashboardMetrics.monthlyRevenue.toFixed(2)}
                    </Typography>
                </Box>
                <Box>
                    <Typography variant="body2" color="text.secondary">
                        Average Repair Value
                    </Typography>
                    <Typography variant="h6">
                        ${dashboardMetrics.averageValue.toFixed(2)}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
}
