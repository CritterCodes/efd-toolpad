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
    HandymanIcon,
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

export default function RepairManagementDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const { repairs, loading } = useRepairs();
    
    // Calculate dashboard metrics
    const dashboardMetrics = React.useMemo(() => {
        if (!repairs || repairs.length === 0) {
            return {
                totalRepairs: 0,
                todaysDue: [],
                overdue: [],
                needsParts: [],
                partsOrdered: [],
                readyForWork: [],
                inProgress: [],
                qualityControl: [],
                readyForPickup: [],
                completed: [],
                rushJobs: [],
                totalValue: 0,
                avgCompletionTime: 0,
                statusDistribution: {}
            };
        }

        const today = new Date();
        const todayStr = today.toDateString();
        
        // Get today's due repairs
        const todaysDue = repairs.filter(repair => {
            if (!repair.promiseDate) return false;
            const promiseDate = new Date(repair.promiseDate);
            return promiseDate.toDateString() === todayStr && repair.status !== 'COMPLETED' && repair.status !== 'PICKED-UP';
        });

        // Get overdue repairs
        const overdue = repairs.filter(repair => {
            if (!repair.promiseDate) return false;
            const promiseDate = new Date(repair.promiseDate);
            return promiseDate < today && repair.status !== 'COMPLETED' && repair.status !== 'PICKED-UP';
        });

        // Status-based filtering
        const needsParts = repairs.filter(r => r.status === 'NEEDS PARTS');
        const partsOrdered = repairs.filter(r => r.status === 'PARTS ORDERED');
        const readyForWork = repairs.filter(r => r.status === 'READY FOR WORK');
        const inProgress = repairs.filter(r => r.status === 'IN PROGRESS');
        const qualityControl = repairs.filter(r => r.status === 'QUALITY CONTROL');
        const readyForPickup = repairs.filter(r => r.status === 'READY FOR PICK-UP');
        const completed = repairs.filter(r => r.status === 'COMPLETED');
        
        // Rush jobs
        const rushJobs = repairs.filter(r => r.isRush === true || r.priority === 'rush');

        // Calculate total value
        const totalValue = repairs.reduce((sum, repair) => {
            return sum + (parseFloat(repair.totalCost) || 0);
        }, 0);

        // Status distribution for progress tracking
        const statusDistribution = {};
        repairs.forEach(repair => {
            const status = repair.status || 'UNKNOWN';
            statusDistribution[status] = (statusDistribution[status] || 0) + 1;
        });

        // Calculate average completion time
        const completedWithDates = repairs.filter(r => 
            r.status === 'COMPLETED' && r.completedAt && r.createdAt
        );
        
        const avgCompletionTime = completedWithDates.length > 0 
            ? completedWithDates.reduce((sum, repair) => {
                const created = new Date(repair.createdAt);
                const completed = new Date(repair.completedAt);
                return sum + (completed - created) / (1000 * 60 * 60 * 24);
              }, 0) / completedWithDates.length
            : 0;

        return {
            totalRepairs: repairs.length,
            todaysDue,
            overdue,
            needsParts,
            partsOrdered,
            readyForWork,
            inProgress,
            qualityControl,
            readyForPickup,
            completed,
            rushJobs,
            totalValue,
            avgCompletionTime,
            statusDistribution
        };
    }, [repairs]);

    // 🔒 ADMIN-ONLY ACCESS
    if (status === 'loading' || loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography>Loading repair management dashboard...</Typography>
                <LinearProgress sx={{ mt: 2 }} />
            </Box>
        );
    }

    if (!session) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    Access denied. This is an internal admin CRM system requiring authentication.
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* 🎯 DASHBOARD HEADER */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    Repair Management Dashboard
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Real-time insights for daily repair operations and workflow management
                </Typography>
            </Box>

            {/* 🚨 CRITICAL ALERTS */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {dashboardMetrics.overdue.length > 0 && (
                    <Grid item xs={12}>
                        <Alert 
                            severity="error" 
                            sx={{ mb: 2 }}
                            action={
                                <Button 
                                    color="inherit" 
                                    size="small" 
                                    onClick={() => router.push('/dashboard/repairs/all?status=overdue')}
                                >
                                    VIEW ALL
                                </Button>
                            }
                        >
                            <strong>{dashboardMetrics.overdue.length} Overdue Repairs</strong> - Immediate attention required
                        </Alert>
                    </Grid>
                )}
                
                {dashboardMetrics.todaysDue.length > 0 && (
                    <Grid item xs={12}>
                        <Alert 
                            severity="warning"
                            action={
                                <Button 
                                    color="inherit" 
                                    size="small" 
                                    onClick={() => router.push('/dashboard/repairs/all')}
                                >
                                    VIEW ALL
                                </Button>
                            }
                        >
                            <strong>{dashboardMetrics.todaysDue.length} Repairs Due Today</strong> - Priority workflow items
                        </Alert>
                    </Grid>
                )}
            </Grid>

            {/* 📊 KEY METRICS */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {/* Due Today */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: dashboardMetrics.todaysDue.length > 0 ? 'warning.light' : 'grey.100' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <AccessTimeIcon color={dashboardMetrics.todaysDue.length > 0 ? 'warning' : 'disabled'} sx={{ mr: 1 }} />
                                <Typography variant="h4" color={dashboardMetrics.todaysDue.length > 0 ? 'warning.dark' : 'text.secondary'}>
                                    {dashboardMetrics.todaysDue.length}
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Due Today
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Needs Parts */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: dashboardMetrics.needsParts.length > 0 ? 'info.light' : 'grey.100' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <ShoppingCartIcon color={dashboardMetrics.needsParts.length > 0 ? 'info' : 'disabled'} sx={{ mr: 1 }} />
                                <Typography variant="h4" color={dashboardMetrics.needsParts.length > 0 ? 'info.dark' : 'text.secondary'}>
                                    {dashboardMetrics.needsParts.length}
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Need Parts
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Ready for Work */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: dashboardMetrics.readyForWork.length > 0 ? 'success.light' : 'grey.100' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <BuildIcon color={dashboardMetrics.readyForWork.length > 0 ? 'success' : 'disabled'} sx={{ mr: 1 }} />
                                <Typography variant="h4" color={dashboardMetrics.readyForWork.length > 0 ? 'success.dark' : 'text.secondary'}>
                                    {dashboardMetrics.readyForWork.length}
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Ready for Work
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Rush Jobs */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ bgcolor: dashboardMetrics.rushJobs.length > 0 ? 'error.light' : 'grey.100' }}>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                <SpeedIcon color={dashboardMetrics.rushJobs.length > 0 ? 'error' : 'disabled'} sx={{ mr: 1 }} />
                                <Typography variant="h4" color={dashboardMetrics.rushJobs.length > 0 ? 'error.dark' : 'text.secondary'}>
                                    {dashboardMetrics.rushJobs.length}
                                </Typography>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                                Rush Jobs
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* 🔄 WORKFLOW STATUS */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TrendingUpIcon /> Workflow Pipeline
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {[
                                    { label: 'Parts Ordered', count: dashboardMetrics.partsOrdered.length, color: 'info', path: '/dashboard/repairs/parts' },
                                    { label: 'Ready for Work', count: dashboardMetrics.readyForWork.length, color: 'success', path: '/dashboard/repairs/all?status=READY FOR WORK' },
                                    { label: 'In Progress', count: dashboardMetrics.inProgress.length, color: 'warning', path: '/dashboard/repairs/all?status=IN PROGRESS' },
                                    { label: 'Quality Control', count: dashboardMetrics.qualityControl.length, color: 'primary', path: '/dashboard/repairs/quality-control' },
                                    { label: 'Ready for Pickup', count: dashboardMetrics.readyForPickup.length, color: 'secondary', path: '/dashboard/repairs/pick-up' }
                                ].map((item) => (
                                    <Box 
                                        key={item.label} 
                                        sx={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center',
                                            cursor: 'pointer',
                                            p: 1,
                                            borderRadius: 1,
                                            '&:hover': { bgcolor: 'grey.100' }
                                        }}
                                        onClick={() => router.push(item.path)}
                                    >
                                        <Typography variant="body1">{item.label}</Typography>
                                        <Chip 
                                            label={item.count} 
                                            color={item.count > 0 ? item.color : 'default'}
                                            size="small"
                                        />
                                    </Box>
                                ))}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <AttachMoneyIcon /> Business Metrics
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Active Value
                                    </Typography>
                                    <Typography variant="h5" color="success.main">
                                        ${dashboardMetrics.totalValue.toLocaleString()}
                                    </Typography>
                                </Box>
                                <Divider />
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Average Completion
                                    </Typography>
                                    <Typography variant="h6">
                                        {dashboardMetrics.avgCompletionTime.toFixed(1)} days
                                    </Typography>
                                </Box>
                                <Divider />
                                <Box>
                                    <Typography variant="body2" color="text.secondary">
                                        Total Active Repairs
                                    </Typography>
                                    <Typography variant="h6">
                                        {dashboardMetrics.totalRepairs - dashboardMetrics.completed.length}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* 📋 TODAY'S PRIORITY LIST */}
            {(dashboardMetrics.todaysDue.length > 0 || dashboardMetrics.overdue.length > 0) && (
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <WarningIcon color="warning" /> Priority Repairs - Immediate Attention
                                </Typography>
                                <List dense>
                                    {/* Overdue items first */}
                                    {dashboardMetrics.overdue.slice(0, 5).map((repair) => (
                                        <ListItem 
                                            key={repair.repairID}
                                            button
                                            onClick={() => router.push(`/dashboard/repairs/${repair.repairID}`)}
                                            sx={{ bgcolor: 'error.light', mb: 1, borderRadius: 1 }}
                                        >
                                            <ListItemIcon>
                                                <WarningIcon color="error" />
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary={`${repair.clientName} - ${repair.description}`}
                                                secondary={`OVERDUE: Due ${new Date(repair.promiseDate).toLocaleDateString()} • ${repair.status}`}
                                            />
                                            <Chip label="OVERDUE" color="error" size="small" />
                                        </ListItem>
                                    ))}
                                    
                                    {/* Today's due items */}
                                    {dashboardMetrics.todaysDue.slice(0, 5).map((repair) => (
                                        <ListItem 
                                            key={repair.repairID}
                                            button
                                            onClick={() => router.push(`/dashboard/repairs/${repair.repairID}`)}
                                            sx={{ bgcolor: 'warning.light', mb: 1, borderRadius: 1 }}
                                        >
                                            <ListItemIcon>
                                                <AccessTimeIcon color="warning" />
                                            </ListItemIcon>
                                            <ListItemText 
                                                primary={`${repair.clientName} - ${repair.description}`}
                                                secondary={`DUE TODAY • ${repair.status}`}
                                            />
                                            <Chip label="TODAY" color="warning" size="small" />
                                        </ListItem>
                                    ))}
                                </List>
                                
                                {(dashboardMetrics.overdue.length + dashboardMetrics.todaysDue.length) > 5 && (
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        sx={{ mt: 2 }}
                                        onClick={() => router.push('/dashboard/repairs/all')}
                                    >
                                        View All Priority Repairs ({dashboardMetrics.overdue.length + dashboardMetrics.todaysDue.length})
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* 🚀 QUICK ACTIONS */}
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                🛠️ Workflow Management
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<ShoppingCartIcon />}
                                    onClick={() => router.push('/dashboard/repairs/parts')}
                                    fullWidth
                                >
                                    Parts Management ({dashboardMetrics.needsParts.length + dashboardMetrics.partsOrdered.length})
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<AssignmentIcon />}
                                    onClick={() => router.push('/dashboard/repairs/quality-control')}
                                    fullWidth
                                >
                                    Quality Control Queue ({dashboardMetrics.qualityControl.length})
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<InventoryIcon />}
                                    onClick={() => router.push('/dashboard/repairs/pick-up')}
                                    fullWidth
                                >
                                    Ready for Pickup ({dashboardMetrics.readyForPickup.length})
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<SpeedIcon />}
                                    onClick={() => router.push('/dashboard/repairs/move')}
                                    fullWidth
                                >
                                    Move Repairs Status
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                👥 Business Operations
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Button
                                    variant="outlined"
                                    startIcon={<BuildIcon />}
                                    onClick={() => router.push('/dashboard/repairs/new')}
                                    fullWidth
                                >
                                    Create New Repair
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<PeopleIcon />}
                                    onClick={() => router.push('/dashboard/clients')}
                                    fullWidth
                                >
                                    Client Management
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<AnalyticsIcon />}
                                    onClick={() => router.push('/dashboard/analytics')}
                                    fullWidth
                                >
                                    Business Analytics
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

            {/* 📈 SYSTEM STATUS */}
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
