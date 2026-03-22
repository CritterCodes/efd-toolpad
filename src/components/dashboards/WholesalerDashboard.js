import React from 'react';
import { Box, Typography, Grid, Alert, LinearProgress, Container } from '@mui/material';
import { Handyman as HandymanIcon } from '@mui/icons-material';
import { useWholesalerDashboard } from '@/hooks/dashboards/useWholesalerDashboard';
import StatCards from './wholesaler/StatCards';
import ActiveOrdersList from './wholesaler/ActiveOrdersList';
import QuickActions from './wholesaler/QuickActions';

export default function WholesalerDashboard() {
    const { 
        session, 
        stats, 
        recentRepairs, 
        loading, 
        error 
    } = useWholesalerDashboard();

    if (loading && !stats) {
        return (
            <Box sx={{ width: '100%', mt: 4 }}>
                <LinearProgress />
            </Box>
        );
    }

    const userName = session?.user?.name || session?.user?.email?.split('@')[0] || 'Wholesaler';

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
                <Box sx={{ 
                    bgcolor: 'primary.main', 
                    color: 'white', 
                    p: 1.5, 
                    borderRadius: 2, 
                    mr: 2,
                    display: 'flex'
                }}>
                    <HandymanIcon />
                </Box>
                <Box>
                    <Typography variant="h4" fontWeight="bold">
                        Welcome back, {userName}
                    </Typography>
                    <Typography variant="body1" color="textSecondary">
                        Here's an overview of your repair accounts
                    </Typography>
                </Box>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 4 }}>
                    {error}
                </Alert>
            )}

            <StatCards stats={stats} loading={loading} />

            <Grid container spacing={4}>
                <Grid item xs={12} md={8}>
                    <ActiveOrdersList 
                        repairs={recentRepairs} 
                        loading={loading} 
                        error={error} 
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <QuickActions />
                </Grid>
            </Grid>
        </Container>
    );
}
