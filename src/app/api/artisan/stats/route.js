/**
 * Artisan Statistics API Endpoint
 * Provides analytics data for artisan dashboards using the centralized analytics collection
 */

import { NextResponse } from 'next/server';
import { auth } from '@/../auth';
import { AnalyticsService } from '@/lib/analyticsService';
import { ShopifyAnalyticsService } from '@/lib/shopifyAnalyticsService';

export async function GET(request) {
    try {
        const session = await auth();
        
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const timeRange = searchParams.get('timeRange') || 'last_30_days';

        console.log('📊 [STATS API] Fetching analytics for:', {
            userID: session.user.userID,
            timeRange
        });

        // Get user business name for analytics lookup
        const businessName = session.user.businessName || session.user.name || 'Unknown';
        
        console.log('🔍 [STATS API] Query parameters:', {
            userID: session.user.userID,
            businessName: businessName,
            sessionUser: session.user
        });

        // Get analytics data from centralized collection
        const analyticsData = await AnalyticsService.getAnalyticsData(
            session.user.userID,
            businessName,
            timeRange
        );

        // Get different time ranges for dashboard cards
        const todayAnalytics = await AnalyticsService.getAnalyticsData(
            session.user.userID,
            businessName,
            'today'
        );
        
        const thisWeekAnalytics = await AnalyticsService.getAnalyticsData(
            session.user.userID,
            businessName,
            'week_to_date'
        );
        
        const thisMonthAnalytics = await AnalyticsService.getAnalyticsData(
            session.user.userID,
            businessName,
            'month_to_date'
        );

        console.log('📊 [STATS API] Analytics data retrieved:', {
            profileViews: analyticsData.profileViews?.total || 0,
            today: todayAnalytics.profileViews?.total || 0,
            thisWeek: thisWeekAnalytics.profileViews?.total || 0,
            thisMonth: thisMonthAnalytics.profileViews?.total || 0
        });

        // Generate time-series data for charts
        const profileViewsTimeSeries = AnalyticsService.generateTimeSeriesData(
            analyticsData.profileViews?.views || [],
            timeRange
        );

        // Try to get Shopify analytics (for orders/revenue)
        let shopifyAnalytics = null;
        try {
            const shopifyService = new ShopifyAnalyticsService();
            shopifyAnalytics = await shopifyService.getVendorAnalytics(
                businessName,
                timeRange
            );
        } catch (shopifyError) {
            console.warn('⚠️ [STATS API] Shopify analytics unavailable:', shopifyError.message);
        }

        // Generate mock revenue data if Shopify data is unavailable
        const revenueTimeSeries = shopifyAnalytics?.timeSeries?.revenue || 
            generateMockRevenueData(timeRange);

        // Combine analytics data
        const combinedStats = {
            summary: {
                profileViews: analyticsData.profileViews?.total || 0,
                profileViewsAllTime: analyticsData.profileViews?.total || 0,
                profileViewsToday: todayAnalytics.profileViews?.total || 0,
                profileViewsThisWeek: thisWeekAnalytics.profileViews?.total || 0,
                profileViewsThisMonth: thisMonthAnalytics.profileViews?.total || 0,
                productsSold: shopifyAnalytics?.summary?.totalProductsSold || 0,
                revenue: shopifyAnalytics?.summary?.totalRevenue || 0,
                rating: analyticsData.ratings?.average || 0,
                ratingCount: analyticsData.ratings?.total || 0
            },
            timeSeries: {
                profileViews: profileViewsTimeSeries,
                revenue: revenueTimeSeries,
                productsSold: shopifyAnalytics?.timeSeries?.productsSold || []
            },
            timeRange,
            lastUpdated: new Date().toISOString()
        };

        console.log('✅ [STATS API] Response prepared:', {
            profileViews: combinedStats.summary.profileViews,
            profileViewsToday: combinedStats.summary.profileViewsToday,
            profileViewsThisWeek: combinedStats.summary.profileViewsThisWeek,
            profileViewsThisMonth: combinedStats.summary.profileViewsThisMonth,
            revenue: combinedStats.summary.revenue,
            productsSold: combinedStats.summary.productsSold
        });

        return NextResponse.json(combinedStats);

    } catch (error) {
        console.error('❌ [STATS API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch artisan statistics' },
            { status: 500 }
        );
    }
}

// Helper function to generate mock revenue data when Shopify is unavailable
function generateMockRevenueData(timeRange) {
    const dataPoints = timeRange.includes('7') ? 7 : timeRange.includes('30') ? 30 : 90;
    const data = [];
    const now = new Date();

    for (let i = dataPoints - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateKey = date.toISOString().split('T')[0];
        
        // Generate some mock revenue data
        const baseRevenue = Math.random() * 500;
        const revenue = Math.floor(baseRevenue);

        data.push({
            date: dateKey,
            value: revenue,
            label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });
    }

    return data;
}