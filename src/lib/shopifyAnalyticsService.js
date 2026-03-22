/**
 * Shopify Analytics Service
 * Pulls real analytics data from Shopify Admin API for vendor/artisan analytics
 */

import { TIMELINE_OPTIONS, getDateRangeForTimeline } from './analytics/timeline.js';
import { buildVendorAnalyticsQuery } from './analytics/queries.js';
import { 
  processVendorAnalyticsData, 
  processAnalyticsData, 
  generateAnalyticsTimeSeriesData, 
  generateTimeSeriesData 
} from './analytics/dataProcessor.js';
import { getMockAnalyticsData } from './analytics/mockData.js';

export { TIMELINE_OPTIONS, getDateRangeForTimeline };

/**
 * Shopify Analytics Service Class
 */
export class ShopifyAnalyticsService {
  constructor() {
    this.shopifyDomain = process.env.SHOPIFY_STORE_DOMAIN;
    this.accessToken = process.env.SHOPIFY_PRIVATE_ACCESS_TOKEN;
    this.apiVersion = '2024-10';
  }

  /**
   * Build GraphQL query for vendor-specific analytics data
   */
  buildVendorAnalyticsQuery(vendorName, timeline) {
    return buildVendorAnalyticsQuery(vendorName, timeline);
  }

  /**
   * Execute GraphQL query against Shopify Admin API
   */
  async executeQuery(query, variables = {}) {
    try {
      console.log(`🛍️ [SHOPIFY API] Executing query against: https://${this.shopifyDomain}/admin/api/${this.apiVersion}/graphql.json`);
      
      const response = await fetch(`https://${this.shopifyDomain}/admin/api/${this.apiVersion}/graphql.json`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken,
        },
        body: JSON.stringify({
          query,
          variables
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ [SHOPIFY API] HTTP Error: ${response.status} ${response.statusText}`, errorText);
        throw new Error(`Shopify API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.errors) {
        console.error(`❌ [SHOPIFY API] GraphQL errors:`, data.errors);
        throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
      }

      console.log(`✅ [SHOPIFY API] Query successful, returning data`);
      return data.data;
    } catch (error) {
      console.error('❌ [SHOPIFY API] Execute query error:', error);
      throw error;
    }
  }

  /**
   * Get vendor analytics for a specific timeline
   */
  async getVendorAnalytics(vendorName, timeline = 'last_30_days') {
    try {
      const query = this.buildVendorAnalyticsQuery(vendorName, timeline);
      
      console.log(`🏪 [SHOPIFY] Fetching analytics for vendor: ${vendorName}, timeline: ${timeline}`);
      const data = await this.executeQuery(query);

      return this.processAnalyticsData(data, vendorName, timeline);
    } catch (error) {
      console.error('Error fetching vendor analytics:', error);
      console.log(`⚠️ [SHOPIFY] Falling back to mock data for vendor: ${vendorName}`);
      // Return vendor-specific mock data if API fails for development
      return this.getMockAnalyticsData(timeline, vendorName);
    }
  }

  /**
   * Process vendor analytics data from Shopify Analytics API
   */
  processVendorAnalyticsData(data, vendorName, timeline) {
    return processVendorAnalyticsData(data, vendorName, timeline);
  }

  /**
   * Process raw Shopify data into analytics format (fallback method)
   */
  processAnalyticsData(data, vendorName, timeline) {
    return processAnalyticsData(data, vendorName, timeline);
  }

  /**
   * Generate time series data from Shopify Analytics API response
   */
  generateAnalyticsTimeSeriesData(salesData, timeline) {
    return generateAnalyticsTimeSeriesData(salesData, timeline);
  }

  /**
   * Generate time series data points for charts (fallback method)
   */
  generateTimeSeriesData(orders, timeline, vendorName) {
    return generateTimeSeriesData(orders, timeline, vendorName);
  }

  /**
   * Mock data for development/fallback
   */
  getMockAnalyticsData(timeline, vendorName = null) {
    return getMockAnalyticsData(timeline, vendorName);
  }
}

export default ShopifyAnalyticsService;
