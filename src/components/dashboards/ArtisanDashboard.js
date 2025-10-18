/**
 * Artisan-Specific Dashboard Content - Streamlined Version
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
    ListItemIcon,
    ListItemAvatar,
    Avatar,
    Chip
} from '@mui/material';
import { 
    AttachMoney as MoneyIcon,
    Star as StarIcon,
    Visibility as VisibilityIcon,
    TrendingUp as TrendingUpIcon,
    ShoppingBag as ShoppingBagIcon,
    Edit as EditIcon,
    Person as PersonIcon,
    LocationOn as LocationIcon,
    CalendarToday as CalendarIcon,
    Event as EventIcon,
    Storefront as StorefrontIcon,
    Business as BusinessIcon,
    Analytics as AnalyticsIcon,
    Message as MessageIcon,
    CheckCircle as CheckCircleIcon,
    Notifications as NotificationsIcon
} from '@mui/icons-material';
import AnalyticsCarousel from '@/components/analytics/AnalyticsCarousel';

export default function ArtisanDashboardContent() {
    const { data: session } = useSession();
    const router = useRouter();
    
    const [stats, setStats] = useState({
        totalOrders: 0,
        revenue: 0,
        rating: 0,
        profileViewsToday: 0,
        profileViewsThisWeek: 0, 
        profileViewsThisMonth: 0,
        profileViews: 0
    });
    
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [recentActivity, setRecentActivity] = useState([]);

    useEffect(() => {
        if (session?.user) {
            fetchDashboardData();
        }
    }, [session]);

    const fetchDashboardData = async () => {
        try {
            const [statsRes, profileRes] = await Promise.all([
                fetch('/api/artisan/stats'),
                fetch('/api/artisan/profile')
            ]);

            if (statsRes.ok) {
                const statsData = await statsRes.json();
                console.log('📊 [DASHBOARD] Received stats data:', statsData);
                
                // Transform API response to match component expectations
                const transformedStats = {
                    profileViewsToday: statsData.summary?.profileViewsToday || 0,
                    profileViewsThisWeek: statsData.summary?.profileViewsThisWeek || 0, 
                    profileViewsThisMonth: statsData.summary?.profileViewsThisMonth || 0,
                    profileViews: statsData.summary?.profileViewsAllTime || statsData.summary?.profileViews || 0,
                    orders: statsData.summary?.orders || 0,
                    revenue: statsData.summary?.revenue || 0,
                    rating: statsData.summary?.rating || 0,
                    ratingCount: statsData.summary?.ratingCount || 0,
                    timeSeries: statsData.timeSeries || {}
                };
                
                console.log('📊 [DASHBOARD] Transformed stats:', transformedStats);
                setStats(transformedStats);
            }

            if (profileRes.ok) {
                const profileData = await profileRes.json();
                setProfile(profileData);
            }

            // Mock recent activity for now
            setRecentActivity([
                { type: 'profile_view', message: 'Your profile was viewed by a customer', timestamp: '2 hours ago' },
                { type: 'order', message: 'New custom order inquiry received', timestamp: '1 day ago' },
                { type: 'profile_update', message: 'Profile information updated', timestamp: '3 days ago' }
            ]);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant={{ xs: 'h5', sm: 'h4' }}>Loading dashboard...</Typography>
                <LinearProgress sx={{ mt: 2 }} />
            </Box>
        );
    }

    return (
        <Box sx={{ p: { xs: 2, sm: 3 } }}>
            {/* Header */}
            <Box sx={{ 
                mb: 4, 
                display: 'flex', 
                flexDirection: { xs: 'column', sm: 'row' },
                justifyContent: 'space-between', 
                alignItems: { xs: 'flex-start', sm: 'flex-start' },
                gap: { xs: 2, sm: 0 }
            }}>
                <Box>
                    <Typography variant={{ xs: 'h5', sm: 'h4' }} gutterBottom>
                        Welcome back, {session?.user?.name?.split(' ')[0] || 'Artisan'}!
                    </Typography>
                    <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ display: { xs: 'none', sm: 'block' } }}
                    >
                        Manage your artisan profile and track your shop performance
                    </Typography>
                </Box>
                <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={() => router.push('/dashboard/profile')}
                    size={{ xs: 'small', sm: 'medium' }}
                    fullWidth={{ xs: true, sm: false }}
                >
                    Edit Profile
                </Button>
            </Box>

            {/* Quick Actions Bar */}
            <Card sx={{ mb: 3 }}>
                <CardContent sx={{ py: { xs: 1.5, sm: 2 } }}>
                    <Box sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: { xs: 'stretch', sm: 'center' }, 
                        gap: { xs: 2, sm: 3 }
                    }}>
                        <Typography 
                            variant="h6" 
                            sx={{ 
                                fontWeight: 'bold', 
                                color: 'primary.main',
                                textAlign: { xs: 'center', sm: 'left' },
                                minWidth: { xs: 'auto', sm: 'fit-content' }
                            }}
                        >
                            Quick Actions
                        </Typography>
                        
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: { xs: 'column', sm: 'row' },
                            gap: { xs: 1.5, sm: 2 }, 
                            flex: 1 
                        }}>
                            <Button
                                variant="contained"
                                startIcon={<StorefrontIcon />}
                                onClick={() => window.open(`https://shop.engelfinedesign.com/vendors/crystal-canyon-arts`, '_blank')}
                                sx={{ flex: 1, px: { xs: 2, sm: 3 } }}
                                size={{ xs: 'small', sm: 'medium' }}
                            >
                                View Your Shop Profile
                            </Button>
                            
                            <Button
                                variant="outlined"
                                startIcon={<ShoppingBagIcon />}
                                onClick={() => window.open('https://shop.engelfinedesign.com/dashboard/orders', '_blank')}
                                sx={{ flex: 1, px: { xs: 2, sm: 3 } }}
                                size={{ xs: 'small', sm: 'medium' }}
                            >
                                Manage Orders
                            </Button>
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            {/* Interactive Analytics Carousel */}
            <AnalyticsCarousel />
        </Box>
    );
}