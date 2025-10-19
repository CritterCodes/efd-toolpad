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
        if (repairData.loading || !repairData.recentRepairs) {
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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
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

    return (
        <Box sx={{ p: isMobile ? 1 : 2 }}>
            {/* Header Section */}
            <Box sx={{ mb: 4 }}>
                <Typography 
                    variant={isMobile ? "h5" : "h4"} 
                    component="h1" 
                    gutterBottom
                    sx={{ fontWeight: 'bold' }}
                >
                    Repair Management
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    Welcome back, {session?.user?.name || 'Wholesaler'}
                </Typography>
            </Box>

            {/* Quick Actions */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={4}>
                    <Button
                        variant="contained"
                        fullWidth
                        startIcon={<AddIcon />}
                        onClick={handleCreateRepair}
                        sx={{ 
                            py: isMobile ? 1.5 : 2,
                            bgcolor: 'primary.main',
                            '&:hover': { bgcolor: 'primary.dark' }
                        }}
                    >
                        Create New Repair
                    </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<TimeIcon />}
                        onClick={handleViewCurrentRepairs}
                        sx={{ py: isMobile ? 1.5 : 2 }}
                    >
                        Current Repairs
                    </Button>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<CompletedIcon />}
                        onClick={handleViewCompletedRepairs}
                        sx={{ py: isMobile ? 1.5 : 2 }}
                    >
                        Completed Repairs
                    </Button>
                </Grid>
            </Grid>

            {/* Repair Stats */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={4}>
                    <Card 
                        elevation={2}
                        sx={{ 
                            height: '100%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white'
                        }}
                    >
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <RepairIcon sx={{ mr: 1, fontSize: 28 }} />
                                <Typography variant="h6" component="div">
                                    Total Repairs
                                </Typography>
                            </Box>
                            <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>
                                {repairData.totalRepairs}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                All time submissions
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
                    <Card 
                        elevation={2}
                        sx={{ 
                            height: '100%',
                            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                            color: 'white'
                        }}
                    >
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <TimeIcon sx={{ mr: 1, fontSize: 28 }} />
                                <Typography variant="h6" component="div">
                                    Active Repairs
                                </Typography>
                            </Box>
                            <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>
                                {repairData.activeRepairs}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                Currently in progress
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={4}>
                    <Card 
                        elevation={2}
                        sx={{ 
                            height: '100%',
                            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                            color: 'white'
                        }}
                    >
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <CompletedIcon sx={{ mr: 1, fontSize: 28 }} />
                                <Typography variant="h6" component="div">
                                    Completed
                                </Typography>
                            </Box>
                            <Typography variant="h3" component="div" sx={{ fontWeight: 'bold' }}>
                                {repairData.completedRepairs}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 1 }}>
                                Finished repairs
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Status Breakdown */}
            {repairData.statusBreakdown && repairData.totalRepairs > 0 && (
                <Card sx={{ mb: 4 }}>
                    <CardContent>
                        <Typography variant="h6" sx={{ mb: 3 }}>
                            Repair Status Breakdown
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={6} sm={2.4}>
                                <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                                    <Typography variant="h6" color="info.main">
                                        {repairData.statusBreakdown.initial}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Initial Review
                                    </Typography>
                                </Card>
                            </Grid>
                            <Grid item xs={6} sm={2.4}>
                                <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                                    <Typography variant="h6" color="warning.main">
                                        {repairData.statusBreakdown.preparation}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Preparation
                                    </Typography>
                                </Card>
                            </Grid>
                            <Grid item xs={6} sm={2.4}>
                                <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                                    <Typography variant="h6" color="primary.main">
                                        {repairData.statusBreakdown.production}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Production
                                    </Typography>
                                </Card>
                            </Grid>
                            <Grid item xs={6} sm={2.4}>
                                <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                                    <Typography variant="h6" color="secondary.main">
                                        {repairData.statusBreakdown.qualityControl}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Quality Control
                                    </Typography>
                                </Card>
                            </Grid>
                            <Grid item xs={6} sm={2.4}>
                                <Card variant="outlined" sx={{ textAlign: 'center', p: 2 }}>
                                    <Typography variant="h6" color="success.main">
                                        {repairData.statusBreakdown.readyForCompletion}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        Ready/Completed
                                    </Typography>
                                </Card>
                            </Grid>
                        </Grid>
                    </CardContent>
                </Card>
            )}

            {/* Recent Repairs */}
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <Typography variant="h6" component="h2">
                                    Recent Repair Submissions
                                </Typography>
                                <Button 
                                    variant="outlined" 
                                    onClick={handleViewCurrentRepairs}
                                    startIcon={<ViewIcon />}
                                >
                                    View All Current
                                </Button>
                            </Box>
                            
                            {repairData.recentRepairs.length > 0 ? (
                                <TableContainer>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Repair ID</TableCell>
                                                <TableCell>Client</TableCell>
                                                <TableCell>Description</TableCell>
                                                <TableCell>Status</TableCell>
                                                <TableCell>Phase</TableCell>
                                                <TableCell>Submitted</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {repairData.recentRepairs.map((repair) => (
                                                <TableRow key={repair.id}>
                                                    <TableCell>
                                                        <Typography variant="subtitle2">
                                                            {repair.id}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>{repair.clientName}</TableCell>
                                                    <TableCell>
                                                        <Typography 
                                                            variant="body2" 
                                                            sx={{
                                                                maxWidth: 200,
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}
                                                            title={repair.itemDescription}
                                                        >
                                                            {repair.itemDescription}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip 
                                                            label={repair.status.replace('-', ' ')} 
                                                            color={getStatusColor(repair.status)}
                                                            size="small"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {repair.statusCategory}
                                                        </Typography>
                                                    </TableCell>
                                                    <TableCell>{formatDate(repair.createdAt)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            ) : (
                                <Box sx={{ textAlign: 'center', py: 4 }}>
                                    <RepairIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                                    <Typography variant="h6" color="text.secondary" gutterBottom>
                                        No repairs submitted yet
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        Get started by creating your first repair request
                                    </Typography>
                                    <Button
                                        variant="contained"
                                        startIcon={<AddIcon />}
                                        onClick={handleCreateRepair}
                                    >
                                        Create Repair Request
                                    </Button>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}