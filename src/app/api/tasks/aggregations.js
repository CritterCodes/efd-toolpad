import { db } from '@/lib/database';
import Constants from '@/lib/constants';

/**
 * Task counts for the statistics route. No prices: these used to average STORED task prices
 * (`basePrice`/`price`) and count stored per-metal price maps (`pricing.totalCosts`). Prices are
 * calculated on read now and never stored (services/pricing/engine.js), so a statistic built from the
 * stored fields would only ever describe snapshots that shouldn't exist.
 */
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
          categories: { $addToSet: '$category' }
        }
      },
      {
        $project: {
          _id: 0,
          total: 1,
          active: 1,
          inactive: 1,
          categories: { $size: '$categories' }
        }
      }
    ]).toArray();

    const categoryStats = await collection.aggregate([
      { $match: { isActive: { $ne: false } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    const metalTypeStats = await collection.aggregate([
      { $match: { isActive: { $ne: false }, metalType: { $exists: true, $ne: null } } },
      { $group: { _id: '$metalType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
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
      overview: stats || { total: 0, active: 0, inactive: 0, categories: 0 },
      byCategory: categoryStats,
      byMetalType: metalTypeStats,
      filters: filtersData || { categories: [], metalTypes: [] }
    };
  } catch (error) {
    console.error('Error getting task statistics:', error);
    throw error;
  }
}
