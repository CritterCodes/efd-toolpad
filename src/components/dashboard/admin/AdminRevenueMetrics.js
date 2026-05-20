import React from 'react';
import { Card, CardContent, Typography, Box, Link } from '@mui/material';

export default function AdminRevenueMetrics({ dashboardMetrics }) {
    return (
        <Card sx={{ mb: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    Operational Value Metrics
                </Typography>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        Monthly Completed Work Value
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
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                        These values come from completed repair totals. Collected revenue is tracked in{' '}
                        <Link href="/dashboard/analytics/reports/financial-foundation" underline="hover">
                            Financial Foundation reports
                        </Link>.
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
}
