/**
 * Ticket Analytics Service - Summary and Analytics Operations
 * Constitutional Architecture: Business Logic Layer
 * Responsibility: Analytics, summaries, and reporting
 */

import DatabaseService from './DatabaseService.js';

// Constitutional embedded logger fallback
let logger;
try {
  logger = require('../utils/logger.js');
} catch (error) {
  logger = {
    error: (message, meta = {}) => console.error(`[ERROR] ${new Date().toISOString()} custom-tickets-service:`, message, meta),
    warn: (message, meta = {}) => console.warn(`[WARN] ${new Date().toISOString()} custom-tickets-service:`, message, meta),
    info: (message, meta = {}) => console.info(`[INFO] ${new Date().toISOString()} custom-tickets-service:`, message, meta),
    debug: (message, meta = {}) => console.debug(`[DEBUG] ${new Date().toISOString()} custom-tickets-service:`, message, meta),
  };
}

export class TicketAnalyticsService {
  /**
   * Get comprehensive tickets summary
   */
  static async getTicketsSummary() {
    try {
      const collection = DatabaseService.getTicketsCollection();
      
      const pipeline = [
        {
          $facet: {
            statusCounts: [
              {
                $group: {
                  _id: '$status',
                  count: { $sum: 1 }
                }
              }
            ],
            typeCounts: [
              {
                $group: {
                  _id: '$type',
                  count: { $sum: 1 }
                }
              }
            ],
            priorityCounts: [
              {
                $group: {
                  _id: '$priority',
                  count: { $sum: 1 }
                }
              }
            ],
            recentTickets: [
              { $sort: { createdAt: -1 } },
              { $limit: 10 },
              {
                $project: {
                  ticketID: 1,
                  title: 1,
                  status: 1,
                  priority: 1,
                  type: 1,
                  createdAt: 1
                }
              }
            ],
            totalStats: [
              {
                $group: {
                  _id: null,
                  totalTickets: { $sum: 1 },
                  totalValue: { $sum: '$quoteTotal' },
                  avgValue: { $avg: '$quoteTotal' },
                  completedTickets: {
                    $sum: {
                      $cond: [{ $eq: ['$status', 'completed'] }, 1, 0]
                    }
                  }
                }
              }
            ]
          }
        }
      ];

      const [result] = await collection.aggregate(pipeline).toArray();
      
      // Format the results
      const summary = {
        overview: {
          totalTickets: result.totalStats[0]?.totalTickets || 0,
          totalValue: result.totalStats[0]?.totalValue || 0,
          averageValue: result.totalStats[0]?.avgValue || 0,
          completedTickets: result.totalStats[0]?.completedTickets || 0,
          completionRate: result.totalStats[0]?.totalTickets ? 
            ((result.totalStats[0]?.completedTickets || 0) / result.totalStats[0].totalTickets * 100).toFixed(2) : '0.00'
        },
        breakdowns: {
          byStatus: this._formatCounts(result.statusCounts),
          byType: this._formatCounts(result.typeCounts),
          byPriority: this._formatCounts(result.priorityCounts)
        },
        recentTickets: result.recentTickets,
        generatedAt: new Date()
      };

      return summary;
    } catch (error) {
      logger.error('Error generating tickets summary:', error);
      throw error;
    }
  }

  /**
   * Get revenue analytics
   */
  static async getRevenueAnalytics(timeframe = '30d') {
    try {
      const collection = DatabaseService.getTicketsCollection();
      
      // Calculate date range
      const now = new Date();
      const days = parseInt(timeframe) || 30;
      const startDate = new Date(now.setDate(now.getDate() - days));
      
      const pipeline = [
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            dailyRevenue: { $sum: '$quoteTotal' },
            ticketCount: { $sum: 1 },
            completedRevenue: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'completed'] },
                  '$quoteTotal',
                  0
                ]
              }
            }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ];

      const dailyStats = await collection.aggregate(pipeline).toArray();
      
      const totalRevenue = dailyStats.reduce((sum, day) => sum + day.dailyRevenue, 0);
      const totalCompleted = dailyStats.reduce((sum, day) => sum + day.completedRevenue, 0);
      const totalTickets = dailyStats.reduce((sum, day) => sum + day.ticketCount, 0);

      return {
        timeframe: `${days} days`,
        totalRevenue,
        completedRevenue: totalCompleted,
        pendingRevenue: totalRevenue - totalCompleted,
        totalTickets,
        averageDailyRevenue: totalRevenue / days,
        dailyBreakdown: dailyStats,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error generating revenue analytics:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  static async getPerformanceMetrics() {
    try {
      const collection = DatabaseService.getTicketsCollection();
      
      const pipeline = [
        {
          $match: {
            completedAt: { $exists: true },
            createdAt: { $exists: true }
          }
        },
        {
          $addFields: {
            processingTime: {
              $subtract: ['$completedAt', '$createdAt']
            }
          }
        },
        {
          $group: {
            _id: null,
            avgProcessingTime: { $avg: '$processingTime' },
            minProcessingTime: { $min: '$processingTime' },
            maxProcessingTime: { $max: '$processingTime' },
            completedTickets: { $sum: 1 }
          }
        }
      ];

      const [metrics] = await collection.aggregate(pipeline).toArray();
      
      if (!metrics) {
        return {
          averageProcessingDays: 0,
          minProcessingDays: 0,
          maxProcessingDays: 0,
          completedTickets: 0,
          generatedAt: new Date()
        };
      }

      // Convert milliseconds to days
      const msPerDay = 1000 * 60 * 60 * 24;
      
      return {
        averageProcessingDays: Math.round(metrics.avgProcessingTime / msPerDay),
        minProcessingDays: Math.round(metrics.minProcessingTime / msPerDay),
        maxProcessingDays: Math.round(metrics.maxProcessingTime / msPerDay),
        completedTickets: metrics.completedTickets,
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error generating performance metrics:', error);
      throw error;
    }
  }

  /**
   * Helper method to format count arrays
   */
  static _formatCounts(counts) {
    const formatted = {};
    counts.forEach(item => {
      formatted[item._id || 'unknown'] = item.count;
    });
    return formatted;
  }
}

export default TicketAnalyticsService;