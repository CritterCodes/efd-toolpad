/**
 * Artisan-Specific Dashboard Content - Streamlined Version
 * Shows artist profile analytics, shop presence metrics, and profile management tools
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
    Typography,
    Box,
    Button,
    LinearProgress,
    Chip
} from '@mui/material';
import {
    Edit as EditIcon,
    Storefront as StorefrontIcon,
    ShoppingBag as ShoppingBagIcon,
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
            <Box sx={{ p: 3 }}>
                <Typography sx={{ color: '#D1D5DB', mb: 2 }}>Loading dashboard...</Typography>
                <LinearProgress sx={{ backgroundColor: '#1F232A', '& .MuiLinearProgress-bar': { backgroundColor: '#D4AF37' } }} />
            </Box>
        );
    }

    const C = {
        bgPanel: '#15181D', bgCard: '#171A1F', bgTertiary: '#1F232A',
        border: '#2A2F38', textHeader: '#D1D5DB', textSecondary: '#9CA3AF', textMuted: '#6B7280',
        accent: '#D4AF37', shadow: '0 8px 24px rgba(0,0,0,0.45)',
    };

    const renderOverviewContent = () => {
        return (
            <Box sx={{ pb: 10 }}>
                {/* Header panel */}
                <Box
                    sx={{
                        backgroundColor: { xs: 'transparent', sm: C.bgPanel },
                        border: { xs: 'none', sm: `1px solid ${C.border}` },
                        borderRadius: { xs: 0, sm: 3 },
                        boxShadow: { xs: 'none', sm: C.shadow },
                        p: { xs: 0.5, sm: 2.5, md: 3 },
                        mb: 3,
                    }}
                >
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'flex-start' }, gap: 2 }}>
                        <Box>
                            <Chip
                                label="Artisan workspace"
                                sx={{ mb: 1.5, borderRadius: 2, backgroundColor: C.bgCard, color: C.textHeader, border: `1px solid ${C.border}`, fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em' }}
                            />
                            <Typography sx={{ fontSize: { xs: 28, md: 36 }, fontWeight: 600, color: C.textHeader, mb: 0.5 }}>
                                Welcome back, {session?.user?.name?.split(' ')[0] || 'Artisan'}
                            </Typography>
                            <Typography sx={{ color: C.textSecondary, lineHeight: 1.6, display: { xs: 'none', sm: 'block' } }}>
                                Manage your artisan profile and track your shop performance.
                            </Typography>
                        </Box>
                        <Button
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => router.push('/dashboard/profile')}
                            size="small"
                            sx={{ color: C.textHeader, borderColor: C.border, backgroundColor: C.bgCard, flexShrink: 0 }}
                        >
                            Edit Profile
                        </Button>
                    </Box>
                </Box>

                {/* Quick Actions */}
                <Box
                    sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: 1.5,
                        mb: 3,
                        p: 2,
                        border: `1px solid ${C.border}`,
                        borderRadius: 2,
                        backgroundColor: C.bgCard,
                    }}
                >
                    <Button
                        variant="outlined"
                        startIcon={<StorefrontIcon />}
                        onClick={() => window.open('https://shop.engelfinedesign.com/vendors/crystal-canyon-arts', '_blank')}
                        fullWidth
                        sx={{ color: C.accent, borderColor: C.accent, backgroundColor: 'transparent' }}
                    >
                        View Shop Profile
                    </Button>
                    <Button
                        variant="outlined"
                        startIcon={<ShoppingBagIcon />}
                        onClick={() => window.open('https://shop.engelfinedesign.com/dashboard/orders', '_blank')}
                        fullWidth
                        sx={{ color: C.textHeader, borderColor: C.border }}
                    >
                        Manage Orders
                    </Button>
                </Box>

                {/* Analytics Carousel */}
                <AnalyticsCarousel />
            </Box>
        );
    };

    return (
        renderOverviewContent()
    );
}