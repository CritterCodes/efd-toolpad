/**
 * Artisan-Specific Dashboard Content
 * Shows artist profile analytics, shop presence metrics, and profile management tools
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
    Alert,
    LinearProgress,
    List,
    ListItem,
    ListItemText,
    ListItemIcon
} from '@mui/material';
import { 
    Build as BuildIcon,
    AssignmentTurnedIn as CompletedIcon,
    Schedule as PendingIcon,
    AttachMoney as MoneyIcon,
    Star as StarIcon,
    Visibility as VisibilityIcon,
    TrendingUp as TrendingUpIcon,
    ShoppingBag as ShoppingBagIcon,
    Edit as EditIcon,
    Settings as SettingsIcon,
    Person as PersonIcon,
    LocationOn as LocationIcon,
    CalendarToday as CalendarIcon,
    Event as EventIcon
} from '@mui/icons-material';

export default function ArtisanDashboardContent() {
    const { data: session } = useSession();
    const router = useRouter();
    
    const [stats, setStats] = useState({
        totalOrders: 0,
        revenue: 0,
        rating: 0,
        profileViews: 0,
        profileViewsThisMonth: 0,
        profileViewsThisWeek: 0,
        profileViewsToday: 0
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

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        Welcome back, {session?.user?.name?.split(' ')[0] || 'Artisan'}!
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Manage your artisan profile and track your shop performance
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={() => router.push('/dashboard/profile')}
                >
                    Edit Profile
                </Button>
            </Box>

            {/* Key Metrics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card>
                        <CardContent>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ flex: 1 }}>
                                    <Typography color="text.secondary" gutterBottom>
                                        Profile Views (All Time)
                                    </Typography>
                                    <Typography variant="h4">
                                        {stats.profileViews || 0}
                                    </Typography>
                                </Box>
                                <VisibilityIcon color="info" sx={{ fontSize: 40 }} />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Profile View Analytics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} md={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Profile View Analytics
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={6} sm={3}>
                                    <Box sx={{ textAlign: 'center', p: 2 }}>
                                        <Typography variant="h5" color="primary">
                                            {stats.profileViewsToday || 0}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Today
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Box sx={{ textAlign: 'center', p: 2 }}>
                                        <Typography variant="h5" color="primary">
                                            {stats.profileViewsThisWeek || 0}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            This Week
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Box sx={{ textAlign: 'center', p: 2 }}>
                                        <Typography variant="h5" color="primary">
                                            {stats.profileViewsThisMonth || 0}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            This Month
                                        </Typography>
                                    </Box>
                                </Grid>
                                <Grid item xs={6} sm={3}>
                                    <Box sx={{ textAlign: 'center', p: 2 }}>
                                        <Typography variant="h5" color="primary">
                                            {stats.profileViews || 0}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            All Time
                                        </Typography>
                                    </Box>
                                </Grid>
                            </Grid>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Quick Actions
                            </Typography>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <Button
                                    variant="contained"
                                    startIcon={<EditIcon />}
                                    onClick={() => router.push('/dashboard/profile')}
                                    fullWidth
                                >
                                    Edit Profile
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<VisibilityIcon />}
                                    onClick={() => window.open(`https://shop.engelfinedesign.com/artisan/${session?.user?.userID}`, '_blank')}
                                    fullWidth
                                >
                                    View Shop Profile
                                </Button>
                                <Button
                                    variant="outlined"
                                    startIcon={<ShoppingBagIcon />}
                                    onClick={() => window.open('https://shop.engelfinedesign.com/dashboard/orders', '_blank')}
                                    fullWidth
                                >
                                    View Orders
                                </Button>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Shop Presence Management */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid item xs={12} lg={8}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Shop Presence Management
                            </Typography>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        startIcon={<SettingsIcon />}
                                        onClick={() => router.push('/dashboard/profile')}
                                        sx={{ height: 80, flexDirection: 'column' }}
                                    >
                                        <Typography variant="subtitle2">Manage Profile</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Update your artisan information
                                        </Typography>
                                    </Button>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        startIcon={<TrendingUpIcon />}
                                        onClick={() => {/* TODO: Analytics page */}}
                                        sx={{ height: 80, flexDirection: 'column' }}
                                    >
                                        <Typography variant="subtitle2">View Analytics</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Track your shop performance
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
                                            {profile?.businessName || 'Business Name Not Set'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {profile?.artisanType || 'Artisan Type Not Set'}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <LocationIcon color="action" />
                                    <Typography variant="body2">
                                        {profile?.businessCity && profile?.businessState 
                                            ? `${profile.businessCity}, ${profile.businessState}`
                                            : profile?.businessCountry || 'Location not set'
                                        }
                                    </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <CalendarIcon color="action" />
                                    <Typography variant="body2">
                                        Joined {profile?.approvedAt ? 
                                            new Date(profile.approvedAt).toLocaleDateString() : 
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
                                        <EventIcon />
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
                            <EventIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                            <Typography variant="body1" color="text.secondary">
                                No recent activity yet
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                Start by completing your profile and uploading your work
                            </Typography>
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Box>
    );
}