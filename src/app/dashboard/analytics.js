"use client";
import * as React from 'react';
import PropTypes from 'prop-types';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import RepairOverviewAnalytics from '../components/analytics/repairOverview.component';
import RepairStatusAnalytics from '../components/analytics/status.component';
import CustomerInsightsAnalytics from '../components/analytics/clientInsights.component';
import RevenueAnalytics from '../components/analytics/revenue.component';
import UpcomingDeadlinesAnalytics from '../components/analytics/upcoming.component';
import Card from '@mui/material/Card';

/**
 * Analytics Page Component
 * - Renders a grid layout with multiple analytics cards
 * - 3 cards per row, with consistent spacing and modern design
 */
export default function AnalyticsPage({ repairs }) {
    return (
        <Box sx={{ padding: 4 }}>
            {/* Page Title */}
            <Typography variant="h4" fontWeight="bold" mb={4}>
                Analytics Dashboard
            </Typography>

            {/* 3-Column Analytics Grid */}
            <Grid container spacing={3}>
                {/* Repair Overview Card */}
                <Grid item xs={12} md={4}>
                    <RepairOverviewAnalytics repairs={repairs} />
                </Grid>

                {/* Placeholder for Other Cards */}
                <Grid item xs={12} md={4}>
                    <RepairStatusAnalytics repairs={repairs} />
                </Grid>

                <Grid item xs={12} md={4}>
                    <CustomerInsightsAnalytics repairs={repairs} />
                </Grid>

                <Grid item xs={12} md={4}>
                    <RevenueAnalytics repairs={repairs} />
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card 
                        sx={{ padding: 3, borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
                    >
                        <Typography variant="h6" fontWeight="bold" mb={2}>
                            Parts Ordered
                        </Typography>
                        <Typography>Coming soon...</Typography>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <UpcomingDeadlinesAnalytics repairs={repairs} />
                </Grid>
            </Grid>
        </Box>
    );
}

AnalyticsPage.propTypes = {
    repairs: PropTypes.array.isRequired,
};
