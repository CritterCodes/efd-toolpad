/**
 * Artisan Analytics API Route
 * Fetches real analytics data from Shopify for artisan vendors
 */

import { connectToDatabase } from '@/lib/mongodb';
import { auth } from '@/../auth';
import ShopifyAnalyticsService from '@/lib/shopifyAnalyticsService';

export async function GET(request) {
    try {
        const session = await auth();
        
        if (!session?.user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get timeline parameter from URL
        const { searchParams } = new URL(request.url);
        const timeline = searchParams.get('timeline') || 'last_30_days';

        // Get user's business name/vendor name from database
        const { db } = await connectToDatabase();
        const user = await db.collection('users').findOne({ 
            userID: session.user.userID 
        });

        if (!user) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }

        // Get vendor name from user profile
        const vendorName = user.businessName || user.firstName + ' ' + user.lastName;
        
        if (!vendorName) {
            return Response.json({ 
                error: 'No business name found for analytics tracking' 
            }, { status: 400 });
        }

        // Fetch analytics from Shopify
        const analyticsService = new ShopifyAnalyticsService();
        const analyticsData = await analyticsService.getVendorAnalytics(vendorName, timeline);

        // Also get profile view data from our database (if we're tracking it)
        const profileViews = await getProfileViewsFromDatabase(user.userID, timeline);

        return Response.json({
            success: true,
            data: {
                vendor: vendorName,
                timeline: timeline,
                summary: {
                    ...analyticsData.summary,
                    profileViews: profileViews.total,
                    profileViewsChange: profileViews.change
                },
                timeSeries: {
                    ...analyticsData.timeSeries,
                    views: profileViews.timeSeries
                }
            }
        });

    } catch (error) {
        console.error('Error fetching artisan stats:', error);
        return Response.json({ 
            error: 'Failed to fetch analytics data',
            details: error.message 
        }, { status: 500 });
    }
}

/**
 * Get profile view data from our database
 */
async function getProfileViewsFromDatabase(userID, timeline) {
    try {
        const { db } = await connectToDatabase();
        
        // Calculate date range based on timeline
        const { startDate, endDate } = calculateDateRange(timeline);
        
        // Get user data to find vendor identifiers
        const user = await db.collection('users').findOne({ userID });
        if (!user) {
            throw new Error('User not found');
        }

        const vendorBusinessName = user.businessName || user.artisanApplication?.businessName;
        
        // Build query for profile views
        const query = {
            timestamp: { $gte: startDate, $lte: endDate },
            $or: [
                { vendorId: userID }
            ]
        };

        // Add business name to query if available
        if (vendorBusinessName) {
            query.$or.push({ vendorBusinessName });
        }

        // Get total views in the time period
        const totalViews = await db.collection('artisan_profile_views').countDocuments(query);

        // Calculate comparison period for change percentage
        const comparisonPeriod = calculateComparisonPeriod(timeline);
        const comparisonQuery = {
            ...query,
            timestamp: { $gte: comparisonPeriod.startDate, $lte: comparisonPeriod.endDate }
        };
        
        const previousViews = await db.collection('artisan_profile_views').countDocuments(comparisonQuery);
        
        // Calculate change percentage
        const change = previousViews > 0 ? ((totalViews - previousViews) / previousViews) * 100 : 0;

        // Get time series data for charts
        const timeSeries = await getViewsTimeSeries(db, query, timeline);

        // Get top referrers
        const referrers = await getTopReferrers(db, query);

        return {
            total: totalViews,
            change: Math.round(change * 10) / 10, // Round to 1 decimal place
            timeSeries,
            referrers
        };

    } catch (error) {
        console.error('Error fetching profile views:', error);
        // Return zero data instead of random data
        return {
            total: 0,
            change: 0,
            timeSeries: [],
            referrers: []
        };
    }
}

/**
 * Calculate date range based on timeline
 */
function calculateDateRange(timeline) {
    const now = new Date();
    let startDate;

    switch (timeline) {
        case 'last_7_days':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'last_30_days':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case 'last_3_months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
            break;
        case 'last_12_months':
            startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
            break;
        case 'week_to_date':
            const dayOfWeek = now.getDay();
            startDate = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000);
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'month_to_date':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'quarter_to_date':
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            break;
        case 'year_to_date':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        default:
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate: now };
}

/**
 * Calculate comparison period for change calculation
 */
function calculateComparisonPeriod(timeline) {
    const now = new Date();
    const current = calculateDateRange(timeline);
    const duration = current.endDate.getTime() - current.startDate.getTime();
    
    return {
        startDate: new Date(current.startDate.getTime() - duration),
        endDate: current.startDate
    };
}

/**
 * Get time series data for views
 */
async function getViewsTimeSeries(db, baseQuery, timeline) {
    try {
        // Determine grouping based on timeline
        let groupBy;
        let dateFormat;
        
        if (timeline.includes('7_days') || timeline.includes('week')) {
            groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } };
            dateFormat = 'day';
        } else if (timeline.includes('30_days') || timeline.includes('month')) {
            groupBy = { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } };
            dateFormat = 'day';
        } else if (timeline.includes('3_months') || timeline.includes('quarter')) {
            groupBy = { $dateToString: { format: "%Y-%U", date: "$timestamp" } };
            dateFormat = 'week';
        } else {
            groupBy = { $dateToString: { format: "%Y-%m", date: "$timestamp" } };
            dateFormat = 'month';
        }

        const pipeline = [
            { $match: baseQuery },
            { 
                $group: {
                    _id: groupBy,
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ];

        const results = await db.collection('artisan_profile_views').aggregate(pipeline).toArray();
        
        return results.map(item => ({
            date: item._id,
            views: item.count
        }));

    } catch (error) {
        console.error('Error getting views time series:', error);
        return [];
    }
}

/**
 * Get top referrers for profile views
 */
async function getTopReferrers(db, baseQuery) {
    try {
        const pipeline = [
            { $match: baseQuery },
            { 
                $group: {
                    _id: "$referrer",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ];

        const results = await db.collection('artisan_profile_views').aggregate(pipeline).toArray();
        
        return results.map(item => ({
            referrer: item._id || 'Direct',
            views: item.count
        }));

    } catch (error) {
        console.error('Error getting top referrers:', error);
        return [];
    }
}