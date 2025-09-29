/**
 * Analytics Controller - Summary and Reporting Operations
 * Constitutional Architecture: Controller Layer
 * Responsibility: HTTP request/response for analytics operations
 */

import CustomTicketService from '../service.js';

export default class AnalyticsController {
  /**
   * GET /api/custom-tickets/summary - Get tickets summary
   */
  static async getTicketsSummary(request) {
    try {
      const summary = await CustomTicketService.getTicketsSummary();

      return Response.json({
        success: true,
        summary
      });
    } catch (error) {
      console.error('Error in getTicketsSummary controller:', error);
      return Response.json({
        success: false,
        error: 'Failed to generate tickets summary'
      }, { status: 500 });
    }
  }

  /**
   * GET /api/custom-tickets/analytics/revenue - Get revenue analytics
   */
  static async getRevenueAnalytics(request) {
    try {
      const { searchParams } = new URL(request.url);
      const timeframe = searchParams.get('timeframe') || '30d';

      const analytics = await CustomTicketService.getRevenueAnalytics(timeframe);

      return Response.json({
        success: true,
        analytics
      });
    } catch (error) {
      console.error('Error in getRevenueAnalytics controller:', error);
      return Response.json({
        success: false,
        error: 'Failed to generate revenue analytics'
      }, { status: 500 });
    }
  }

  /**
   * GET /api/custom-tickets/analytics/performance - Get performance metrics
   */
  static async getPerformanceMetrics(request) {
    try {
      const metrics = await CustomTicketService.getPerformanceMetrics();

      return Response.json({
        success: true,
        metrics
      });
    } catch (error) {
      console.error('Error in getPerformanceMetrics controller:', error);
      return Response.json({
        success: false,
        error: 'Failed to generate performance metrics'
      }, { status: 500 });
    }
  }
}