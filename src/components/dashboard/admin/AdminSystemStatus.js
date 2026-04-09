import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';
import { CheckCircle as CheckCircleIcon, TrendingUp as TrendingUpIcon, Speed as SpeedIcon } from '@mui/icons-material';

export default function AdminSystemStatus({ dashboardMetrics }) {
    return (
        <Card sx={{ mt: 3 }}>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    System Status
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Chip 
                        icon={<CheckCircleIcon />} 
                        label={`Total Repairs: ${dashboardMetrics.totalRepairs}`}
                        color="success" 
                    />
                    <Chip 
                        icon={<CheckCircleIcon />} 
                        label={`Completed: ${dashboardMetrics.completed.length}`}
                        color="success" 
                    />
                    <Chip 
                        icon={<TrendingUpIcon />} 
                        label={`Active: ${dashboardMetrics.totalRepairs - dashboardMetrics.completed.length}`}
                        color="info" 
                    />
                    {dashboardMetrics.rushJobs.length > 0 && (
                        <Chip 
                            icon={<SpeedIcon />} 
                            label={`Rush Jobs: ${dashboardMetrics.rushJobs.length}`}
                            color="error" 
                        />
                    )}
                </Box>
            </CardContent>
        </Card>
    );
}
