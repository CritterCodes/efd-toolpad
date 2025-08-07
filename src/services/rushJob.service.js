/**
 * Rush Job Management Service
 * Handles rush job validation, limits, and pricing
 */

import { db } from '@/lib/database';

export class RushJobService {
  /**
   * Check if rush job can be created based on admin limits
   * @param {Date} promiseDate - The promise date for the repair
   * @returns {Promise<Object>} - { canCreate: boolean, currentRushJobs: number, maxRushJobs: number }
   */
  static async canCreateRushJob(promiseDate = null) {
    try {
      await db.connect();
      
      // Get admin settings for rush job limits
      const adminCollection = db._instance.collection('adminSettings');
      const adminSettings = await adminCollection.findOne({ _id: 'repair_task_admin_settings' });
      
      if (!adminSettings?.business?.maxRushJobs) {
        console.warn('No rush job limit configured in admin settings');
        return { canCreate: true, currentRushJobs: 0, maxRushJobs: -1 };
      }
      
      const maxRushJobs = adminSettings.business.maxRushJobs;
      
      // Count current active rush jobs
      const repairsCollection = db._instance.collection('repairs');
      const currentRushJobs = await repairsCollection.countDocuments({
        $or: [
          { isRush: true },
          { priority: 'rush' } // Legacy support
        ],
        status: { 
          $nin: ['completed', 'picked-up', 'cancelled'] 
        }
      });
      
      const canCreate = currentRushJobs < maxRushJobs;
      
      console.log('Rush job validation:', {
        currentRushJobs,
        maxRushJobs,
        canCreate,
        promiseDate: promiseDate?.toISOString()
      });
      
      return {
        canCreate,
        currentRushJobs,
        maxRushJobs,
        remainingSlots: Math.max(0, maxRushJobs - currentRushJobs)
      };
      
    } catch (error) {
      console.error('Error checking rush job limits:', error);
      return { canCreate: true, currentRushJobs: 0, maxRushJobs: -1, error: error.message };
    }
  }
  
  /**
   * Calculate rush job pricing markup
   * @param {number} basePrice - The base price before rush markup
   * @returns {Promise<Object>} - { rushPrice: number, markup: number, basePrice: number }
   */
  static async calculateRushPricing(basePrice) {
    try {
      await db.connect();
      
      // Get admin settings for rush job markup
      const adminCollection = db._instance.collection('adminSettings');
      const adminSettings = await adminCollection.findOne({ _id: 'repair_task_admin_settings' });
      
      const rushMarkup = adminSettings?.business?.rushJobMarkup || 1.5;
      const rushPrice = Math.round(basePrice * rushMarkup * 100) / 100;
      
      console.log('Rush pricing calculation:', {
        basePrice,
        rushMarkup,
        rushPrice,
        additionalCost: rushPrice - basePrice
      });
      
      return {
        rushPrice,
        basePrice,
        markup: rushMarkup,
        additionalCost: rushPrice - basePrice
      };
      
    } catch (error) {
      console.error('Error calculating rush pricing:', error);
      return { rushPrice: basePrice, basePrice, markup: 1.0, additionalCost: 0 };
    }
  }
  
  /**
   * Get rush job statistics for dashboard
   * @returns {Promise<Object>} - Rush job statistics
   */
  static async getRushJobStats() {
    try {
      await db.connect();
      
      const repairsCollection = db._instance.collection('repairs');
      const adminCollection = db._instance.collection('adminSettings');
      
      // Get settings
      const adminSettings = await adminCollection.findOne({ _id: 'repair_task_admin_settings' });
      const maxRushJobs = adminSettings?.business?.maxRushJobs || 0;
      
      // Count rush jobs by status
      const pipeline = [
        {
          $match: {
            $or: [
              { isRush: true },
              { priority: 'rush' }
            ]
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ];
      
      const statusCounts = await repairsCollection.aggregate(pipeline).toArray();
      const statusMap = statusCounts.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {});
      
      const activeRushJobs = Object.keys(statusMap)
        .filter(status => !['completed', 'picked-up', 'cancelled'].includes(status))
        .reduce((sum, status) => sum + (statusMap[status] || 0), 0);
      
      return {
        maxRushJobs,
        activeRushJobs,
        remainingSlots: Math.max(0, maxRushJobs - activeRushJobs),
        utilization: maxRushJobs > 0 ? Math.round((activeRushJobs / maxRushJobs) * 100) : 0,
        statusBreakdown: statusMap,
        atCapacity: activeRushJobs >= maxRushJobs
      };
      
    } catch (error) {
      console.error('Error getting rush job stats:', error);
      return {
        maxRushJobs: 0,
        activeRushJobs: 0,
        remainingSlots: 0,
        utilization: 0,
        statusBreakdown: {},
        atCapacity: false,
        error: error.message
      };
    }
  }
  
  /**
   * Validate if a repair qualifies as a rush job based on promise date
   * @param {Date} promiseDate - The promise date
   * @returns {boolean} - Whether this should be considered a rush job
   */
  static shouldBeRushJob(promiseDate) {
    if (!promiseDate) return false;
    
    const promise = new Date(promiseDate);
    const now = new Date();
    const diffTime = promise.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Rush if promise date is within 2 days (configurable)
    const rushThresholdDays = 2;
    
    return diffDays <= rushThresholdDays && diffDays >= 0;
  }
  
  /**
   * Get business days calculation (excluding weekends)
   * @param {Date} startDate 
   * @param {Date} endDate 
   * @returns {number} - Number of business days
   */
  static getBusinessDaysBetween(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    let businessDays = 0;
    
    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        businessDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return businessDays;
  }
}
