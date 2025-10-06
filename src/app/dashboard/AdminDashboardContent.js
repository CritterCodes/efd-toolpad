/**
 * Admin/Staff/Dev Dashboard Content
 * The original comprehensive dashboard for administrative users
 */

'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { 
    Card, 
    CardContent, 
    Typography, 
    Box, 
    Grid, 
    Button,
    Chip,
    Alert,
    Badge,
    LinearProgress,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Paper
} from '@mui/material';
import { 
    Settings as SettingsIcon,
    People as PeopleIcon,
    Build as BuildIcon,
    Handyman as HandymanIcon,
    Analytics as AnalyticsIcon,
    CheckCircle as CheckCircleIcon,
    Schedule as ScheduleIcon,
    AttachMoney as AttachMoneyIcon,
    Warning as WarningIcon,
    ShoppingCart as ShoppingCartIcon,
    Assignment as AssignmentIcon,
    Inventory as InventoryIcon,
    AccessTime as AccessTimeIcon,
    TrendingUp as TrendingUpIcon,
    Speed as SpeedIcon
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useRepairs } from '@/app/context/repairs.context';

export default function AdminDashboardContent() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { repairs, loading } = useRepairs();
    
    // Calculate dashboard metrics
    const dashboardMetrics = React.useMemo(() => {
        if (!repairs || loading) {
            return {
                totalRepairs: 0,
                pendingReceipts: [],
                inProgress: [],
                completed: [],
                qcRequired: [],
                readyForPickup: [],
                rushJobs: [],
                averageValue: 0,
                monthlyRevenue: 0
            };
        }

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const pendingReceipts = repairs.filter(r => r.status === 'pending-receipt' || r.status === 'received');
        const inProgress = repairs.filter(r => r.status === 'in-progress' || r.status === 'repair-started');
        const completed = repairs.filter(r => r.status === 'completed' || r.status === 'picked-up');
        const qcRequired = repairs.filter(r => r.status === 'quality-control' || r.status === 'qc-review');
        const readyForPickup = repairs.filter(r => r.status === 'ready-for-pickup' || r.status === 'payment-pending');
        const rushJobs = repairs.filter(r => r.rushJob === true || r.priority === 'rush');

        // Calculate revenue for current month
        const monthlyRevenue = completed
            .filter(r => {
                const completedDate = new Date(r.completedDate || r.updatedAt);
                return completedDate.getMonth() === currentMonth && 
                       completedDate.getFullYear() === currentYear;
            })
            .reduce((sum, r) => sum + (parseFloat(r.totalCost) || 0), 0);

        const averageValue = completed.length > 0 
            ? completed.reduce((sum, r) => sum + (parseFloat(r.totalCost) || 0), 0) / completed.length
            : 0;

        return {
            totalRepairs: repairs.length,
            pendingReceipts,
            inProgress,
            completed,
            qcRequired,
            readyForPickup,
            rushJobs,
            averageValue,
            monthlyRevenue
        };
    }, [repairs, loading]);

    // Get recent activity
    const recentActivity = React.useMemo(() => {
        if (!repairs || loading) return [];
        
        return repairs
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, 5)
            .map(repair => ({
                id: repair.repairID || repair._id,
                customerName: repair.customerName || 'Unknown Customer',
                status: repair.status,
                updatedAt: repair.updatedAt,
                type: repair.repairType || 'General Repair'
            }));
    }, [repairs, loading]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <LinearProgress sx={{ width: '100%' }} />
            </Box>
        );
    }

    return (
        <Box>
            {/* Header Section */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Repair Management Dashboard
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    Welcome back, {session?.user?.name}
                </Typography>
            </Box>

            {/* Rush Jobs Alert */}
            {dashboardMetrics.rushJobs.length > 0 && (
                <Alert severity="warning" sx={{ mb: 3 }} icon={<SpeedIcon />}>
                    <strong>Rush Jobs Alert:</strong> {dashboardMetrics.rushJobs.length} urgent repairs require immediate attention.
                    <Button 
                        size="small" 
                        sx={{ ml: 2 }}
                        onClick={() => router.push('/dashboard/repairs?filter=rush')}
                    >
                        View Rush Jobs
                    </Button>
                </Alert>
            )}

            {/* Quick Stats Grid */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography color="text.secondary" gutterBottom variant="body2">
                                        Pending Receipts
                                    </Typography>
                                    <Typography variant="h4">
                                        {dashboardMetrics.pendingReceipts.length}
                                    </Typography>
                                </Box>
                                <ScheduleIcon sx={{ color: 'warning.main', fontSize: 40 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography color="text.secondary" gutterBottom variant="body2">
                                        In Progress
                                    </Typography>
                                    <Typography variant="h4">
                                        {dashboardMetrics.inProgress.length}
                                    </Typography>
                                </Box>
                                <BuildIcon sx={{ color: 'info.main', fontSize: 40 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography color="text.secondary" gutterBottom variant="body2">
                                        QC Required
                                    </Typography>
                                    <Typography variant="h4">
                                        {dashboardMetrics.qcRequired.length}
                                    </Typography>
                                </Box>
                                <CheckCircleIcon sx={{ color: 'warning.main', fontSize: 40 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box>
                                    <Typography color="text.secondary" gutterBottom variant="body2">
                                        Ready for Pickup
                                    </Typography>
                                    <Typography variant="h4">
                                        {dashboardMetrics.readyForPickup.length}
                                    </Typography>
                                </Box>
                                <ShoppingCartIcon sx={{ color: 'success.main', fontSize: 40 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Main Content Grid */}
            <Grid container spacing={3}>
                {/* Recent Activity */}
                <Grid item xs={12} lg={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Recent Activity
                            </Typography>
                            <List>
                                {recentActivity.map((activity, index) => (
                                    <React.Fragment key={activity.id}>
                                        <ListItem>
                                            <ListItemIcon>
                                                <AccessTimeIcon color="action" />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={`${activity.customerName} - ${activity.type}`}
                                                secondary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Chip 
                                                            label={activity.status} 
                                                            size="small" 
                                                            variant="outlined"
                                                        />
                                                        <Typography variant="caption" color="text.secondary">
                                                            {new Date(activity.updatedAt).toLocaleDateString()}
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                        </ListItem>
                                        {index < recentActivity.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Revenue & Quick Actions */}
                <Grid item xs={12} lg={4}>
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

                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Quick Actions
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Button
                                    variant="contained"
                                    startIcon={<PeopleIcon />}
                                    onClick={() => router.push('/dashboard/clients')}
                                    fullWidth
                                >
                                    Manage Clients
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={<HandymanIcon />}
                                    onClick={() => router.push('/dashboard/repairs')}
                                    fullWidth
                                >
                                    View All Repairs
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<AnalyticsIcon />}
                                    onClick={() => router.push('/dashboard/analytics')}
                                    fullWidth
                                >
                                    Analytics
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<SettingsIcon />}
                                    onClick={() => router.push('/dashboard/admin/settings')}
                                    fullWidth
                                >
                                    Admin Settings
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* System Status */}
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
        </Box>
    );
}