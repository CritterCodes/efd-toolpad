/**
 * Analytics Service for efd-admin
 * Reads analytics data from the centralized analytics collection
 */

import { connectToDatabase } from './mongodb.js';

export class AnalyticsService {
  static COLLECTION_NAME = 'analytics';

  /**
   * Get analytics data for an artisan with time range filtering
   */
  static async getAnalyticsData(userID, vendorBusinessName, timeRange = 'last_30_days') {
    try {
      console.log('🔍 [ANALYTICS] Getting data for:', { userID, vendorBusinessName, timeRange });
      
      const { db } = await connectToDatabase();
      const collection = db.collection(this.COLLECTION_NAME);

      // Try multiple query strategies to find the analytics document
      let analytics = null;
      
      // Strategy 1: Try userID first
      if (userID) {
        console.log('🔍 [ANALYTICS] Trying userID query:', { userID });
        analytics = await collection.findOne({ userID });
      }
      
      // Strategy 2: If not found, try vendorBusinessName
      if (!analytics && vendorBusinessName) {
        console.log('🔍 [ANALYTICS] Trying vendorBusinessName query:', { vendorBusinessName });
        analytics = await collection.findOne({ vendorBusinessName });
      }
      
      // Strategy 3: If still not found, try partial business name matching
      if (!analytics && vendorBusinessName) {
        console.log('🔍 [ANALYTICS] Trying partial business name search');
        analytics = await collection.findOne({ 
          vendorBusinessName: { $regex: vendorBusinessName.split(' ')[0], $options: 'i' } 
        });
      }
      
      console.log('🔍 [ANALYTICS] Final result:', analytics ? 'Found analytics document' : 'No document found');
      if (analytics) {
        console.log('🔍 [ANALYTICS] Document userID:', analytics.userID);
        console.log('🔍 [ANALYTICS] Document vendorBusinessName:', analytics.vendorBusinessName);
      }

      if (!analytics) {
        console.log('📊 [ANALYTICS] No analytics found, returning empty data');
        return {
          profileViews: { total: 0, views: [], dailyStats: {}, monthlyStats: {}, yearlyStats: {} },
          ratings: { average: 0, total: 0, ratings: [], distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
          timeRange,
          startDate: new Date(),
          endDate: new Date()
        };
      }

      console.log('✅ [ANALYTICS] Found analytics document with profile views:', analytics.profileViews?.total || 0);

      // Filter data based on time range
      const { startDate, endDate } = this.getTimeRangeDates(timeRange);
      
      // Filter profile views
      const filteredViews = analytics.profileViews.views.filter(view => 
        new Date(view.timestamp) >= startDate && new Date(view.timestamp) <= endDate
      );

      return {
        profileViews: {
          total: filteredViews.length,
          views: filteredViews,
          dailyStats: analytics.profileViews.dailyStats || {},
          monthlyStats: analytics.profileViews.monthlyStats || {},
          yearlyStats: analytics.profileViews.yearlyStats || {}
        },
        ratings: analytics.ratings || { average: 0, total: 0, ratings: [], distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } },
        timeRange,
        startDate,
        endDate
      };
    } catch (error) {
      console.error('❌ [ANALYTICS] Error getting analytics data:', error);
      throw error;
    }
  }

  /**
   * Generate time-series data for charts
   */
  static generateTimeSeriesData(views, timeRange) {
    try {
      const { startDate, endDate } = this.getTimeRangeDates(timeRange);
      const timeSeriesData = [];

      // Group views by date
      const viewsByDate = {};
      views.forEach(view => {
        const date = new Date(view.timestamp).toISOString().split('T')[0];
        viewsByDate[date] = (viewsByDate[date] || 0) + 1;
      });

      // Generate data points for each day in the range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        timeSeriesData.push({
          date: dateKey,
          value: viewsByDate[dateKey] || 0
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return timeSeriesData;
    } catch (error) {
      console.error('❌ [ANALYTICS] Error generating time series:', error);
      return [];
    }
  }

  /**
   * Helper to get start and end dates for time ranges
   */
  static getTimeRangeDates(timeRange) {
    const now = new Date();
    const endDate = new Date(now);
    let startDate = new Date(now);

    switch (timeRange) {
      case 'last_7_days':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'last_30_days':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'last_3_months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'last_12_months':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'week_to_date':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
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
      case 'last_week':
        const lastWeekEnd = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000 - 24 * 60 * 60 * 1000);
        const lastWeekStart = new Date(lastWeekEnd.getTime() - 6 * 24 * 60 * 60 * 1000);
        startDate = lastWeekStart;
        endDate.setTime(lastWeekEnd.getTime());
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        endDate.setTime(new Date(now.getFullYear(), now.getMonth(), 0).getTime());
        break;
      case 'last_quarter':
        const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
        startDate = new Date(now.getFullYear(), lastQuarter * 3, 1);
        endDate.setTime(new Date(now.getFullYear(), (lastQuarter + 1) * 3, 0).getTime());
        break;
      case 'last_year':
        startDate = new Date(now.getFullYear() - 1, 0, 1);
        endDate.setTime(new Date(now.getFullYear() - 1, 11, 31).getTime());
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    return { startDate, endDate };
  }
}