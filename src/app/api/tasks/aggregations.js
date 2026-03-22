import { db } from '@/lib/database';
import Constants from '@/lib/constants';

export async function getTaskStatisticsAggregation() {
  const collectionName = Constants.TASKS_COLLECTION || 'tasks';

  try {
    await db.connect();
    const collection = db._instance.collection(collectionName);

    const [stats] = await collection.aggregate([
      { $match: {} },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] } },
          inactive: { $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] } },
          withUniversalPricing: { $sum: { $cond: [{ $exists: ['$pricing.totalCosts'] }, 1, 0] } },
          averagePrice: { $avg: { $ifNull: ['$basePrice', { $ifNull: ['$price', 0] }] } },
          totalPrice: { $sum: { $ifNull: ['$basePrice', { $ifNull: ['$price', 0] }] } },
          categories: { $addToSet: '$category' },
          supportedMetals: { $addToSet: '$pricing.supportedMetals' }
        }
      },
      {
        $project: {
          _id: 0,
          total: 1,
          active: 1,
          inactive: 1,
          withUniversalPricing: 1,
          averagePrice: { $round: ['$averagePrice', 2] },
          totalPrice: { $round: ['$totalPrice', 2] },
          categories: { $size: '$categories' },
          supportedMetals: 1
        }
      }
    ]).toArray();

    const categoryStats = await collection.aggregate([
      { $match: { isActive: { $ne: false } } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          avgPrice: { $avg: { $ifNull: ['$basePrice', { $ifNull: ['$price', 0] }] } },
          withUniversalPricing: { $sum: { $cond: [{ $exists: ['$pricing.totalCosts'] }, 1, 0] } }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    const metalTypeStats = await collection.aggregate([
      { $match: { isActive: { $ne: false }, metalType: { $exists: true, $ne: null } } },
      {
        $group: {
          _id: '$metalType',
          count: { $sum: 1 },
          avgPrice: { $avg: { $ifNull: ['$basePrice', { $ifNull: ['$price', 0] }] } }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    const universalPricingStats = await collection.aggregate([
      { $match: { 'pricing.totalCosts': { $exists: true } } },
      {
        $project: {
          supportedMetalCount: { $size: { $objectToArray: '$pricing.totalCosts' } },
          baseLaborHours: '$pricing.baseLaborHours',
          processCosts: '$pricing.processCosts'
        }
      },
      {
        $group: {
          _id: null,
          tasksWithUniversalPricing: { $sum: 1 },
          avgSupportedMetals: { $avg: '$supportedMetalCount' },
          avgLaborHours: { $avg: '$baseLaborHours' }
        }
      }
    ]).toArray();

    const [filtersData] = await collection.aggregate([
      {
        $group: {
          _id: null,
          categories: { $addToSet: '$category' },
          metalTypes: { $addToSet: '$metalType' }
        }
      },
      {
        $project: {
          _id: 0,
          categories: { $filter: { input: '$categories', cond: { $ne: ['$$this', null] } } },
          metalTypes: { $filter: { input: '$metalTypes', cond: { $ne: ['$$this', null] } } }
        }
      }
    ]).toArray();

    return {
      overview: stats || {
        total: 0, active: 0, inactive: 0, withUniversalPricing: 0,
        averagePrice: 0, totalPrice: 0, categories: 0, supportedMetals: []
      },
      byCategory: categoryStats,
      byMetalType: metalTypeStats,
      universalPricing: universalPricingStats[0] || {
        tasksWithUniversalPricing: 0, avgSupportedMetals: 0, avgLaborHours: 0
      },
      filters: filtersData || { categories: [], metalTypes: [] }
    };
  } catch (error) {
    console.error('Error getting task statistics:', error);
    throw error;
  }
}