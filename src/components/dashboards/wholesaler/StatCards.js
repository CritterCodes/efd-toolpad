import React from 'react';
import { Grid, Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';
import { Build, Schedule, CheckCircle, Speed } from '@mui/icons-material';

export default function StatCards({ stats, loading }) {
    const statCards = [
        {
            title: "Active Repairs",
            value: stats.activeRepairs,
            icon: <Build sx={{ fontSize: 40, color: 'primary.main', opacity: 0.8 }} />,
            color: 'primary.main',
            subtitle: "Currently in progress"
        },
        {
            title: "Pending Approval",
            value: stats.pendingApproval,
            icon: <Schedule sx={{ fontSize: 40, color: 'warning.main', opacity: 0.8 }} />,
            color: 'warning.main',
            subtitle: "Awaiting your action"
        },
        {
            title: "Completed",
            value: stats.completedThisMonth,
            icon: <CheckCircle sx={{ fontSize: 40, color: 'success.main', opacity: 0.8 }} />,
            color: 'success.main',
            subtitle: "This month"
        },
        {
            title: "Avg. Turnaround",
            value: stats.averageTurnaroundTime,
            icon: <Speed sx={{ fontSize: 40, color: 'info.main', opacity: 0.8 }} />,
            color: 'info.main',
            subtitle: "Overall average"
        }
    ];

    if (loading) {
        return (
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {[1, 2, 3, 4].map(i => (
                    <Grid item xs={12} sm={6} md={3} key={i}>
                        <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 140 }}>
                            <CircularProgress size={30} />
                        </Card>
                    </Grid>
                ))}
            </Grid>
        );
    }

    return (
        <Grid container spacing={3} sx={{ mb: 4 }}>
            {statCards.map((card, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                    <Card sx={{ height: '100%' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Box>
                                    <Typography color="textSecondary" variant="overline" display="block" gutterBottom fontWeight="bold">
                                        {card.title}
                                    </Typography>
                                    <Typography variant="h4" component="div" fontWeight="bold">
                                        {card.value}
                                    </Typography>
                                    <Typography variant="caption" color="textSecondary">
                                        {card.subtitle}
                                    </Typography>
                                </Box>
                                <Box sx={{ p: 1, borderRadius: 2, bgcolor: `${card.color}15` }}>
                                    {card.icon}
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );
}
