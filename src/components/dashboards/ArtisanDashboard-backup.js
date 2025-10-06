/**
 * Artisan-Specific Dashboard Content
 * Shows repair workflow, available work, performance metrics, and profile management for artisans
 * Migrated from efd-shop with enhanced functionality
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
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
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    ListItemButton,
    Divider,
    Avatar,
    IconButton
} from '@mui/material';
import { 
    Build as BuildIcon,
    AssignmentTurnedIn as CompletedIcon,
    Schedule as PendingIcon,
    Star as StarIcon,
    TrendingUp as TrendingUpIcon,
    Assignment as AssignmentIcon,
    Visibility as VisibilityIcon,
    ShoppingBag as ShoppingBagIcon,
    AttachMoney as MoneyIcon,
    Person as PersonIcon,
    Settings as SettingsIcon,
    Edit as EditIcon,
    LocationOn as LocationIcon,
    CalendarToday as CalendarIcon,
    Activity as ActivityIcon
} from '@mui/icons-material';

export default function ArtisanDashboardContent() {
    const { data: session } = useSession();
    const router = useRouter();
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalRevenue: 0,
        averageRating: 0,
        profileViews: 0,
        activeRepairs: 0,
        completedRepairs: 0,
        pendingRepairs: 0
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        fetchArtisanData();
    }, []);

    const fetchArtisanData = async () => {
        try {
            setLoading(true);
            
            // Fetch artisan stats
            const statsResponse = await fetch('/api/artisan/stats');
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                setStats(prev => ({ ...prev, ...statsData.data }));
            }

            // Fetch profile data (if available)
            const profileResponse = await fetch('/api/artisan/profile');
            if (profileResponse.ok) {
                const profileData = await profileResponse.json();
                setProfile(profileData.data);
            }

            // TODO: Fetch recent repair activity
            // This would come from the repair management system

        } catch (error) {
            console.error('Error fetching artisan data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h4" gutterBottom>
                    Artisan Dashboard
                </Typography>
                <LinearProgress sx={{ mt: 2 }} />
            </Box>
        );
    }

    const artisanApplication = session?.user?.artisanApplication || profile;

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        Artisan Dashboard
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Welcome back, {artisanApplication?.businessName || session?.user?.name}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<VisibilityIcon />}
                        onClick={() => router.push(`/vendors/${artisanApplication?.slug}`)}
                        size="small"
                    >
                        View Public Profile
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => router.push('/dashboard/profile')}
                        size="small"
                    >
                        Edit Profile
                    </Button>
                </Box>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography color="text.secondary" gutterBottom>
                                        Total Orders
                                    </Typography>
                                    <Typography variant="h4">
                                        {stats.totalOrders}
                                    </Typography>
                                </Box>
                                <ShoppingBagIcon color="primary" sx={{ fontSize: 40 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography color="text.secondary" gutterBottom>
                                        Revenue
                                    </Typography>
                                    <Typography variant="h4">
                                        ${(stats.totalRevenue || 0).toLocaleString()}
                                    </Typography>
                                </Box>
                                <MoneyIcon color="success" sx={{ fontSize: 40 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography color="text.secondary" gutterBottom>
                                        Rating
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="h4">
                                            {stats.averageRating || 0}
                                        </Typography>
                                        <StarIcon sx={{ color: 'gold' }} />
                                    </Box>
                                </Box>
                                <StarIcon color="warning" sx={{ fontSize: 40 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'between' }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography color="text.secondary" gutterBottom>
                                        Profile Views
                                    </Typography>
                                    <Typography variant="h4">
                                        {stats.profileViews}
                                    </Typography>
                                </Box>
                                <VisibilityIcon color="info" sx={{ fontSize: 40 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Quick Actions & Profile Summary */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} lg={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Quick Actions
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        startIcon={<EditIcon />}
                                        onClick={() => router.push('/dashboard/profile')}
                                        sx={{ py: 2, flexDirection: 'column', gap: 1 }}
                                    >
                                        <Typography variant="subtitle2">Edit Profile</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Update your business information
                                        </Typography>
                                    </Button>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        startIcon={<AssignmentIcon />}
                                        onClick={() => router.push('/dashboard/my-repairs')}
                                        sx={{ py: 2, flexDirection: 'column', gap: 1 }}
                                    >
                                        <Typography variant="subtitle2">View My Repairs</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Manage your current repairs
                                        </Typography>
                                    </Button>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} lg={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Profile Summary
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <PersonIcon color="action" />
                                    <Box>
                                        <Typography variant="body2" fontWeight="medium">
                                            {artisanApplication?.businessName || 'Business Name Not Set'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {artisanApplication?.artisanType || 'Artisan Type Not Set'}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <LocationIcon color="action" />
                                    <Typography variant="body2">
                                        {artisanApplication?.businessCity && artisanApplication?.businessState 
                                            ? `${artisanApplication.businessCity}, ${artisanApplication.businessState}`
                                            : artisanApplication?.businessCountry || 'Location not set'
                                        }
                                    </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <CalendarIcon color="action" />
                                    <Typography variant="body2">
                                        Joined {artisanApplication?.approvedAt ? 
                                            new Date(artisanApplication.approvedAt).toLocaleDateString() : 
                                            'Recently'
                                        }
                                    </Typography>
                                </Box>

                                <Button
                                    variant="contained"
                                    size="small"
                                    fullWidth
                                    onClick={() => router.push('/dashboard/profile')}
                                    sx={{ mt: 2 }}
                                >
                                    Complete Profile
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Recent Activity */}
            <Card>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Recent Activity
                    </Typography>
                    {recentActivity.length > 0 ? (
                        <List>
                            {recentActivity.map((activity, index) => (
                                <ListItem key={index}>
                                    <ListItemIcon>
                                        <ActivityIcon />
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={activity.title}
                                        secondary={activity.date}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    ) : (
                        <Box sx={{ textAlign: 'center', py: 4 }}>
                            <ActivityIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="body1" color="text.secondary">
                                No recent activity yet
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Start by completing your profile or taking on repairs
                            </Typography>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}
    AttachMoney as EarningsIcon,
    TrendingUp as TrendingUpIcon,
    Star as StarIcon,
    Handyman as HandymanIcon,
    Assignment as TaskIcon,
    CheckCircle as CheckIcon
} from '@mui/icons-material';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function ArtisanDashboardContent() {
    const { data: session } = useSession();
    const router = useRouter();
    const [dashboardData, setDashboardData] = useState({
        myRepairs: {
            inProgress: 3,
            pendingQC: 2,
            completed: 15
        },
        availableWork: [
            {
                id: 'REP-001',
                type: 'Ring Sizing',
                priority: 'High',
                estimatedTime: '2 hours',
                payment: '$85'
            },
            {
                id: 'REP-002',
                type: 'Chain Repair',
                priority: 'Medium',
                estimatedTime: '1 hour',
                payment: '$45'
            },
            {
                id: 'REP-003',
                type: 'Stone Setting',
                priority: 'High',
                estimatedTime: '3 hours',
                payment: '$120'
            }
        ],
        performance: {
            monthlyEarnings: 2450,
            completionRate: 98,
            averageRating: 4.8,
            totalJobs: 47
        },
        recentActivity: [
            'Completed ring sizing for Customer #234',
            'Started stone setting repair REP-098',
            'Quality check passed for chain repair'
        ]
    });

    const handleAcceptWork = (repairId) => {
        console.log('Accepting work:', repairId);
        // TODO: Implement work acceptance logic
    };

    const handleViewMyRepairs = () => {
        router.push('/dashboard/my-repairs');
    };

    return (
        <Box>
            {/* Welcome Section */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Welcome back, {session?.user?.name}
                </Typography>
                <Typography variant="subtitle1" color="text.secondary">
                    Artisan Dashboard - Track your repairs and find new work
                </Typography>
            </Box>

            <Grid container spacing={3}>
                {/* Performance Metrics */}
                <Grid item xs={12} md={6} lg={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                                    <EarningsIcon />
                                </Avatar>
                                <Box>
                                    <Typography variant="h6">Monthly Earnings</Typography>
                                    <Typography variant="h4" color="primary">
                                        ${dashboardData.performance.monthlyEarnings}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6} lg={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                                    <TrendingUpIcon />
                                </Avatar>
                                <Box>
                                    <Typography variant="h6">Completion Rate</Typography>
                                    <Typography variant="h4" color="success.main">
                                        {dashboardData.performance.completionRate}%
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6} lg={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
                                    <StarIcon />
                                </Avatar>
                                <Box>
                                    <Typography variant="h6">Average Rating</Typography>
                                    <Typography variant="h4" color="warning.main">
                                        {dashboardData.performance.averageRating}★
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={6} lg={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                                    <HandymanIcon />
                                </Avatar>
                                <Box>
                                    <Typography variant="h6">Total Jobs</Typography>
                                    <Typography variant="h4" color="info.main">
                                        {dashboardData.performance.totalJobs}
                                    </Typography>
                                </Box>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                {/* My Current Repairs */}
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                                <Typography variant="h6" component="h2">
                                    My Current Repairs
                                </Typography>
                                <Button 
                                    variant="outlined" 
                                    onClick={handleViewMyRepairs}
                                    startIcon={<BuildIcon />}
                                >
                                    View All
                                </Button>
                            </Box>
                            
                            <Grid container spacing={2} sx={{ mb: 3 }}>
                                <Grid item xs={4}>
                                    <Box textAlign="center">
                                        <Typography variant="h4" color="primary">
                                            {dashboardData.myRepairs.inProgress}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            In Progress
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={4}>
                                    <Box textAlign="center">
                                        <Typography variant="h4" color="warning.main">
                                            {dashboardData.myRepairs.pendingQC}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Pending QC
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={4}>
                                    <Box textAlign="center">
                                        <Typography variant="h4" color="success.main">
                                            {dashboardData.myRepairs.completed}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Completed
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>

                            <Alert severity="info" sx={{ mt: 2 }}>
                                You have {dashboardData.myRepairs.pendingQC} repairs pending quality control review
                            </Alert>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Available Work */}
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" component="h2" gutterBottom>
                                Available Work
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                New repair jobs matching your skills
                            </Typography>
                            
                            <List>
                                {dashboardData.availableWork.map((work, index) => (
                                    <React.Fragment key={work.id}>
                                        <ListItem
                                            secondaryAction={
                                                <Button 
                                                    size="small" 
                                                    variant="contained"
                                                    onClick={() => handleAcceptWork(work.id)}
                                                >
                                                    Accept
                                                </Button>
                                            }
                                        >
                                            <ListItemIcon>
                                                <TaskIcon />
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <Typography variant="subtitle2">
                                                            {work.type}
                                                        </Typography>
                                                        <Chip 
                                                            label={work.priority} 
                                                            size="small" 
                                                            color={work.priority === 'High' ? 'error' : 'primary'}
                                                        />
                                                    </Box>
                                                }
                                                secondary={
                                                    <Box>
                                                        <Typography variant="body2">
                                                            {work.estimatedTime} • {work.payment}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            ID: {work.id}
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                        </ListItem>
                                        {index < dashboardData.availableWork.length - 1 && <Divider />}
                                    </React.Fragment>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Recent Activity */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" component="h2" gutterBottom>
                                Recent Activity
                            </Typography>
                            <List>
                                {dashboardData.recentActivity.map((activity, index) => (
                                    <ListItem key={index}>
                                        <ListItemIcon>
                                            <CheckIcon color="success" />
                                        </ListItemIcon>
                                        <ListItemText primary={activity} />
                                    </ListItem>
                                ))}
                            </List>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}