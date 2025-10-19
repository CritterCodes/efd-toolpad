/**
 * Wholesaler Dashboard Content
 * Admin-style dashboard focused on repair management for wholesalers
 * Shows only repair data pertaining to the current wholesaler user
 */

'use client';

import React, { useState, useEffect } from 'react';
import { 
    Card, 
    CardContent, 
    Typography, 
    Box, 
    Grid, 
    Button,
    Chip,
    Alert,
    LinearProgress,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    useTheme,
    useMediaQuery
} from '@mui/material';
import { 
    Build as BuildIcon,
    Add as AddIcon,
    Visibility as ViewIcon,
    CheckCircle as CheckCircleIcon,
    Schedule as ScheduleIcon,
    AttachMoney as AttachMoneyIcon,
    Warning as WarningIcon,
    ShoppingCart as ShoppingCartIcon,
    AccessTime as AccessTimeIcon,
    Speed as SpeedIcon,
    Handyman as HandymanIcon,
    Assignment as AssignmentIcon
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function WholesalerDashboardContent() {
    const { data: session } = useSession();
    const router = useRouter();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    // State for repair data
    const [repairData, setRepairData] = useState({
        totalRepairs: 0,
        activeRepairs: 0,
        completedRepairs: 0,
        recentRepairs: [],
        statusBreakdown: {},
        loading: true
    });

    // Calculate dashboard metrics
    const dashboardMetrics = React.useMemo(() => {
        if (repairData.loading || !repairData.allRepairs) {
            return {
                pendingReceipts: [],
                inProgress: [],
                completed: [],
                qcRequired: [],
                readyForPickup: [],
                needsParts: [],
                averageValue: 0,
                monthlyValue: 0
            };
        }

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Get full repair list from API data
        const allRepairs = repairData.allRepairs || [];
        
        const pendingReceipts = allRepairs.filter(r => r.status === 'receiving');
        const inProgress = allRepairs.filter(r => r.status === 'in-progress');
        const completed = allRepairs.filter(r => ['completed', 'picked-up'].includes(r.status));
        const qcRequired = allRepairs.filter(r => r.status === 'quality-control');
        const readyForPickup = allRepairs.filter(r => r.status === 'ready-for-pickup');
        const needsParts = allRepairs.filter(r => ['needs-parts', 'parts-ordered'].includes(r.status));

        // Calculate value metrics for current month
        const monthlyCompleted = completed.filter(r => {
            const completedDate = new Date(r.completedDate || r.updatedAt);
            return completedDate.getMonth() === currentMonth && 
                   completedDate.getFullYear() === currentYear;
        });

        const monthlyValue = monthlyCompleted.reduce((sum, r) => sum + (parseFloat(r.totalCost) || 0), 0);
        
        const averageValue = completed.length > 0 
            ? completed.reduce((sum, r) => sum + (parseFloat(r.totalCost) || 0), 0) / completed.length
            : 0;

        return {
            pendingReceipts,
            inProgress,
            completed,
            qcRequired,
            readyForPickup,
            needsParts,
            averageValue,
            monthlyValue
        };
    }, [repairData]);

    // Get recent activity
    const recentActivity = React.useMemo(() => {
        if (repairData.loading || !repairData.allRepairs) return [];
        
        return repairData.allRepairs
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
            .slice(0, 5)
            .map(repair => ({
                id: repair.repairNumber || repair._id,
                clientName: `${repair.clientFirstName} ${repair.clientLastName}`,
                status: repair.status,
                updatedAt: repair.updatedAt,
                itemDescription: repair.repairDescription || 'No description'
            }));
    }, [repairData]);

    // Fetch repair data
    useEffect(() => {
        const fetchRepairData = async () => {
            try {
                const response = await fetch('/api/repairs/my-repairs');
                if (response.ok) {
                    const data = await response.json();
                    const repairs = data.repairs || [];
                    
                    // Calculate repair stats
                    const activeRepairs = repairs.filter(r => 
                        !['completed', 'picked-up', 'cancelled'].includes(r.status)
                    ).length;
                    
                    const completedRepairs = repairs.filter(r => 
                        ['completed', 'picked-up'].includes(r.status)
                    ).length;

                    setRepairData({
                        totalRepairs: repairs.length,
                        activeRepairs,
                        completedRepairs,
                        allRepairs: repairs, // Store full repair list for metrics
                        recentRepairs: repairs.slice(0, 5).map(repair => ({
                            id: repair.repairNumber || repair._id,
                            clientName: `${repair.clientFirstName} ${repair.clientLastName}`,
                            status: repair.status,
                            statusCategory: getStatusCategory(repair.status),
                            statusDescription: getStatusDescription(repair.status),
                            itemDescription: repair.repairDescription || 'No description',
                            createdAt: repair.createdAt,
                            dueDate: repair.dueDate
                        })),
                        statusBreakdown: {
                            initial: repairs.filter(r => getStatusCategory(r.status) === 'Initial').length,
                            preparation: repairs.filter(r => getStatusCategory(r.status) === 'Preparation').length,
                            production: repairs.filter(r => getStatusCategory(r.status) === 'Production').length,
                            qualityControl: repairs.filter(r => getStatusCategory(r.status) === 'Quality Control').length,
                            readyForCompletion: repairs.filter(r => getStatusCategory(r.status) === 'Completion').length
                        },
                        loading: false
                    });
                }
            } catch (error) {
                console.error('Error fetching repair data:', error);
                setRepairData(prev => ({ ...prev, loading: false }));
            }
        };

        fetchRepairData();
    }, []);

    const getStatusColor = (status) => {
        const colorMap = {
            // Actual repair workflow statuses
            'receiving': 'info',
            'needs-parts': 'warning',
            'parts-ordered': 'info', 
            'ready-for-work': 'primary',
            'in-progress': 'warning',
            'quality-control': 'secondary',
            'ready-for-pickup': 'primary',
            'completed': 'success',
            
            // Completion statuses
            'picked-up': 'success',
            'delivered': 'success',
            
            // Special statuses
            'on-hold': 'warning',
            'cancelled': 'error'
        };
        return colorMap[status?.toLowerCase()] || 'default';
    };

    const getStatusDescription = (status) => {
        const descriptions = {
            // Actual repair workflow statuses
            'receiving': 'Item received, initial processing',
            'needs-parts': 'Waiting for parts to be ordered',
            'parts-ordered': 'Parts ordered, waiting for delivery',
            'ready-for-work': 'Ready to begin repair work',
            'in-progress': 'Repair work is currently being done',
            'quality-control': 'Final quality review and inspection',
            'ready-for-pickup': 'Repair completed, ready for customer pickup',
            'completed': 'Repair finished and ready',
            
            // Completion statuses  
            'picked-up': 'Customer has picked up the item',
            'delivered': 'Item has been delivered to customer',
            
            // Special statuses
            'on-hold': 'Repair temporarily paused',
            'cancelled': 'Repair has been cancelled'
        };
        return descriptions[status?.toLowerCase()] || 'Status unknown';
    };

    const getStatusCategory = (status) => {
        const categories = {
            'receiving': 'Initial',
            'needs-parts': 'Preparation',
            'parts-ordered': 'Preparation',
            'ready-for-work': 'Preparation',
            'in-progress': 'Production',
            'quality-control': 'Quality Control',
            'ready-for-pickup': 'Completion',
            'completed': 'Completion',
            'picked-up': 'Completion',
            'delivered': 'Completion',
            'on-hold': 'Special',
            'cancelled': 'Special'
        };
        return categories[status?.toLowerCase()] || 'Unknown';
    };

    const handleCreateRepair = () => {
        router.push('/dashboard/repairs/new');
    };

    const handleViewCurrentRepairs = () => {
        router.push('/dashboard/repairs/current');
    };

    const handleViewCompletedRepairs = () => {
        router.push('/dashboard/repairs/completed');
    };

    // Helper functions for status display
    function getStatusLabel(status) {
        const labelMap = {
            'receiving': 'Receiving',
            'needs-parts': 'Needs Parts',
            'parts-ordered': 'Parts Ordered',
            'ready-for-work': 'Ready for Work',
            'in-progress': 'In Progress',
            'quality-control': 'Quality Control',
            'ready-for-pickup': 'Ready for Pickup',
            'completed': 'Completed',
            'picked-up': 'Picked Up',
            'delivered': 'Delivered'
        };
        return labelMap[status] || status;
    }

    if (repairData.loading) {
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
                    Welcome back, {session?.user?.name || 'Wholesaler'}
                </Typography>
            </Box>

            {/* Rush/Priority Alert */}
            {dashboardMetrics.needsParts.length > 0 && (
                <Alert severity="warning" sx={{ mb: 3 }} icon={<WarningIcon />}>
                    <strong>Parts Required:</strong> {dashboardMetrics.needsParts.length} repairs are waiting for parts.
                    <Button 
                        size="small" 
                        sx={{ ml: 2 }}
                        onClick={() => router.push('/dashboard/repairs/current?filter=needs-parts')}
                    >
                        View Parts Needed
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
                                        Receiving
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
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <Typography variant="h6">
                                    Recent Activity
                                </Typography>
                                <Button 
                                    variant="outlined" 
                                    onClick={handleViewCurrentRepairs}
                                    startIcon={<ViewIcon />}
                                    size="small"
                                >
                                    View All
                                </Button>
                            </Box>
                            <List>
                                {recentActivity.map((activity, index) => (
                                    <React.Fragment key={activity.id}>
                                        <ListItem>
                                            <ListItemIcon>
                                                <AccessTimeIcon color="action" />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={`${activity.clientName} - ${activity.itemDescription}`}
                                                secondary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Chip 
                                                            label={getStatusLabel(activity.status)} 
                                                            size="small" 
                                                            color={getStatusColor(activity.status)}
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
                                {recentActivity.length === 0 && (
                                    <ListItem>
                                        <ListItemText
                                            primary="No recent activity"
                                            secondary="Submit your first repair to get started"
                                        />
                                    </ListItem>
                                )}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Value Metrics & Quick Actions */}
                <Grid item xs={12} lg={4}>
                    <Card sx={{ mb: 3 }}>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Repair Metrics
                            </Typography>
                            <Box sx={{ mb: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Monthly Repair Value
                                </Typography>
                                <Typography variant="h5" color="success.main">
                                    ${dashboardMetrics.monthlyValue.toFixed(2)}
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
                                    startIcon={<AddIcon />}
                                    onClick={handleCreateRepair}
                                    fullWidth
                                >
                                    Create New Repair
                                </Button>
                                <Button
                                    variant="contained"
                                    startIcon={<HandymanIcon />}
                                    onClick={handleViewCurrentRepairs}
                                    fullWidth
                                >
                                    View Current Repairs
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<AssignmentIcon />}
                                    onClick={handleViewCompletedRepairs}
                                    fullWidth
                                >
                                    View Completed
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Status Overview */}
            <Card sx={{ mt: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Repair Pipeline Status
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Chip 
                            icon={<CheckCircleIcon />} 
                            label={`Total Repairs: ${repairData.totalRepairs}`}
                            color="success" 
                        />
                        <Chip 
                            icon={<BuildIcon />} 
                            label={`Active: ${repairData.activeRepairs}`}
                            color="info" 
                        />
                        <Chip 
                            icon={<CheckCircleIcon />} 
                            label={`Completed: ${repairData.completedRepairs}`}
                            color="success" 
                        />
                        {dashboardMetrics.needsParts.length > 0 && (
                            <Chip 
                                icon={<WarningIcon />} 
                                label={`Needs Parts: ${dashboardMetrics.needsParts.length}`}
                                color="warning" 
                            />
                        )}
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
}