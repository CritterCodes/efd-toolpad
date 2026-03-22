import { db } from '@/lib/database';
import { ObjectId } from 'mongodb';
import Constants from '@/lib/constants';
import { formatMetalKey, buildQuery } from './queries.js';

const collectionName = Constants.TASKS_COLLECTION || 'tasks';

export async function getTaskPriceForMetalStr(taskId, metalType, karat) {
  try {
    await db.connect();
    const collection = db._instance.collection(collectionName);

    const task = await collection.findOne({ _id: new ObjectId(taskId) });
    if (!task) {
      throw new Error('Task not found');
    }

    const metalKey = formatMetalKey(metalType, karat);

    if (!task.pricing?.totalCosts) {
      throw new Error('Task does not have universal pricing structure');
    }

    const price = task.pricing.totalCosts[metalKey];
    if (price === undefined) {
      throw new Error(`Task "${task.title}" does not support metal: ${metalKey}`);
    }

    return {
      taskId,
      metalKey,
      price,
      laborHours: task.pricing.baseLaborHours || 0,
      processCosts: task.pricing.processCosts || {},
      calculatedAt: task.pricing.calculatedAt
    };
  } catch (error) {
    console.error('Error getting task price for metal:', error);
    throw error;
  }
}

export async function getTaskSupportedMetalsStr(taskId) {
  try {
    await db.connect();
    const collection = db._instance.collection(collectionName);

    const task = await collection.findOne(
      { _id: new ObjectId(taskId) },
      { projection: { 'pricing.supportedMetals': 1, 'pricing.totalCosts': 1 } }
    );

    if (!task) {
      throw new Error('Task not found');
    }

    return task.pricing?.supportedMetals || Object.keys(task.pricing?.totalCosts || {});
  } catch (error) {
    console.error('Error getting task supported metals:', error);
    throw error;
  }
}

export async function updateTaskPricingStr(taskId, universalPricing) {
  try {
    await db.connect();
    const collection = db._instance.collection(collectionName);

    const updatePayload = {
      pricing: universalPricing,
      updatedAt: new Date(),
      pricingLastCalculated: new Date()
    };

    const result = await collection.updateOne(
      { _id: new ObjectId(taskId) },
      { $set: updatePayload }
    );

    if (result.matchedCount === 0) {
      throw new Error('Task not found');
    }

    // Fetch the updated doc
    return await collection.findOne({ _id: new ObjectId(taskId) });
  } catch (error) {
    console.error('Error updating task pricing:', error);
    throw error;
  }
}

export async function getTasksForMetalContextStr(metalType, karat, filters = {}) {
  try {
    await db.connect();
    const collection = db._instance.collection(collectionName);

    const metalKey = formatMetalKey(metalType, karat);
    const query = buildQuery(filters);

    query[`pricing.totalCosts.${metalKey}`] = { $exists: true, $gt: 0 };

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    const skip = (page - 1) * limit;

    const sort = {};
    if (filters.sortBy) {
      sort[filters.sortBy] = filters.sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.title = 1;
    }

    const tasks = await collection
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();

    const tasksWithMetalPricing = tasks.map(task => ({
      ...task,
      metalContext: {
        metalType,
        karat,
        metalKey,
        price: task.pricing?.totalCosts?.[metalKey] || 0,
        laborHours: task.pricing?.baseLaborHours || 0
      }
    }));

    const total = await collection.countDocuments(query);

    return {
      tasks: tasksWithMetalPricing,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      metalContext: { metalType, karat, metalKey }
    };
  } catch (error) {
    console.error('Error getting tasks for metal context:', error);
    throw error;
  }
}
