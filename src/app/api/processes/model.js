import { ObjectId } from 'mongodb';
import { db } from '@/lib/database';
import Constants from '@/lib/constants';

/**
 * Process Data Model
 * Handles direct database operations for repair processes
 */
export class ProcessModel {
  static collectionName = Constants.PROCESSES_COLLECTION;

  /**
   * Get all processes with optional filtering
   */
  static async findAll(query = {}) {
    await db.connect();
    return await db._instance
      .collection(this.collectionName)
      .find(query)
      .sort({ category: 1, displayName: 1 })
      .toArray();
  }

  /**
   * Find a single process by ID
   */
  static async findById(id) {
    await db.connect();
    return await db._instance
      .collection(this.collectionName)
      .findOne({ _id: new ObjectId(id) });
  }

  /**
   * Find a process by display name
   */
  static async findByDisplayName(displayName, excludeId = null) {
    await db.connect();
    const query = { displayName: displayName.trim() };
    if (excludeId) {
      query._id = { $ne: new ObjectId(excludeId) };
    }
    return await db._instance
      .collection(this.collectionName)
      .findOne(query);
  }

  /**
   * Create a new process
   */
  static async create(processData) {
    await db.connect();
    const result = await db._instance
      .collection(this.collectionName)
      .insertOne({
        ...processData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    
    return {
      insertedId: result.insertedId,
      process: { _id: result.insertedId, ...processData }
    };
  }

  /**
   * Update an existing process
   */
  static async updateById(id, updateData) {
    await db.connect();
    const result = await db._instance
      .collection(this.collectionName)
      .updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: {
            ...updateData,
            updatedAt: new Date()
          }
        }
      );
    
    return result;
  }

  /**
   * Delete a process by ID
   */
  static async deleteById(id) {
    await db.connect();
    return await db._instance
      .collection(this.collectionName)
      .deleteOne({ _id: new ObjectId(id) });
  }

  /**
   * Check if a process exists by ID
   */
  static async exists(id) {
    await db.connect();
    const count = await db._instance
      .collection(this.collectionName)
      .countDocuments({ _id: new ObjectId(id) });
    return count > 0;
  }

  /**
   * Get processes by category
   */
  static async findByCategory(category) {
    await db.connect();
    return await db._instance
      .collection(this.collectionName)
      .find({ category: category.toLowerCase() })
      .sort({ displayName: 1 })
      .toArray();
  }

  /**
   * Get processes by skill level
   */
  static async findBySkillLevel(skillLevel) {
    await db.connect();
    return await db._instance
      .collection(this.collectionName)
      .find({ skillLevel })
      .sort({ displayName: 1 })
      .toArray();
  }

  /**
   * Get active processes only
   */
  static async findActive() {
    await db.connect();
    return await db._instance
      .collection(this.collectionName)
      .find({ isActive: true })
      .sort({ category: 1, displayName: 1 })
      .toArray();
  }

  /**
   * Get process statistics
   */
  static async getStats() {
    await db.connect();
    const pipeline = [
      {
        $group: {
          _id: null,
          totalProcesses: { $sum: 1 },
          activeProcesses: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          averageLaborHours: { $avg: '$laborHours' },
          averageTotalCost: { $avg: '$pricing.totalCost' },
          categoryCounts: {
            $push: '$category'
          },
          skillLevelCounts: {
            $push: '$skillLevel'
          }
        }
      }
    ];

    const stats = await db._instance
      .collection(this.collectionName)
      .aggregate(pipeline)
      .toArray();

    return stats[0] || {
      totalProcesses: 0,
      activeProcesses: 0,
      averageLaborHours: 0,
      averageTotalCost: 0,
      categoryCounts: [],
      skillLevelCounts: []
    };
  }
}
