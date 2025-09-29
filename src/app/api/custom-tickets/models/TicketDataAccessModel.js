/**
 * Ticket Data Access Model - Database Operations
 * Constitutional Architecture: Model Layer - Data Access
 * Responsibility: Direct database operations and queries
 */

import { db } from '@/lib/database.js';

export default class TicketDataAccessModel {
  static collection = 'customTickets';

  /**
   * Get database collection
   */
  static async getCollection() {
    try {
      return await db.dbCustomTickets();
    } catch (error) {
      throw new Error(`Failed to access collection: ${error.message}`);
    }
  }

  /**
   * Find ticket by ID
   */
  static async findById(ticketId) {
    try {
      const collection = await this.getCollection();
      return await collection.findOne({
        $or: [
          { ticketID: ticketId },
          { _id: ticketId }
        ]
      });
    } catch (error) {
      throw new Error(`Failed to find ticket: ${error.message}`);
    }
  }

  /**
   * Create new ticket
   */
  static async create(ticketData) {
    try {
      const collection = await this.getCollection();
      const result = await collection.insertOne(ticketData);
      
      if (!result.insertedId) {
        throw new Error('Failed to create ticket');
      }

      return await collection.findOne({ _id: result.insertedId });
    } catch (error) {
      throw new Error(`Failed to create ticket: ${error.message}`);
    }
  }

  /**
   * Update ticket by ID
   */
  static async updateById(ticketId, updateData) {
    try {
      const collection = await this.getCollection();
      const result = await collection.updateOne(
        {
          $or: [
            { ticketID: ticketId },
            { _id: ticketId }
          ]
        },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        throw new Error('Ticket not found');
      }

      return await this.findById(ticketId);
    } catch (error) {
      throw new Error(`Failed to update ticket: ${error.message}`);
    }
  }

  /**
   * Delete ticket by ID
   */
  static async deleteById(ticketId) {
    try {
      const collection = await this.getCollection();
      const result = await collection.deleteOne({
        $or: [
          { ticketID: ticketId },
          { _id: ticketId }
        ]
      });

      if (result.deletedCount === 0) {
        throw new Error('Ticket not found');
      }

      return { success: true, ticketId };
    } catch (error) {
      throw new Error(`Failed to delete ticket: ${error.message}`);
    }
  }

  /**
   * Find tickets with filters
   */
  static async findWithFilters(filters = {}) {
    try {
      const collection = await this.getCollection();
      const query = this.buildQuery(filters);
      const options = this.buildQueryOptions(filters);

      const [tickets, totalCount] = await Promise.all([
        collection.find(query, options).toArray(),
        collection.countDocuments(query)
      ]);

      return { tickets, totalCount };
    } catch (error) {
      throw new Error(`Failed to find tickets: ${error.message}`);
    }
  }

  /**
   * Build MongoDB query from filters
   */
  static buildQuery(filters) {
    const query = {};

    if (filters.type) query.type = filters.type;
    if (filters.status) query.status = filters.status;
    if (filters.priority) query.priority = filters.priority;

    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
    }

    return query;
  }

  /**
   * Build query options for sorting and pagination
   */
  static buildQueryOptions(filters) {
    const options = {};

    // Sorting
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'desc' ? -1 : 1;
    options.sort = { [sortBy]: sortOrder };

    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 50;
    options.skip = (page - 1) * limit;
    options.limit = limit;

    return options;
  }

  /**
   * Count tickets by status
   */
  static async countByStatus() {
    try {
      const collection = await this.getCollection();
      return await collection.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]).toArray();
    } catch (error) {
      throw new Error(`Failed to count tickets by status: ${error.message}`);
    }
  }

  /**
   * Get ticket statistics
   */
  static async getStatistics() {
    try {
      const collection = await this.getCollection();
      return await collection.aggregate([
        {
          $group: {
            _id: null,
            totalTickets: { $sum: 1 },
            totalValue: { $sum: '$quoteTotal' },
            avgValue: { $avg: '$quoteTotal' },
            completedTickets: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            }
          }
        }
      ]).toArray();
    } catch (error) {
      throw new Error(`Failed to get statistics: ${error.message}`);
    }
  }

  /**
   * Add communication to ticket
   */
  static async addCommunication(ticketId, communicationData) {
    try {
      const collection = await this.getCollection();
      
      const result = await collection.updateOne(
        {
          $or: [
            { ticketID: ticketId },
            { _id: ticketId }
          ]
        },
        {
          $push: { 
            communications: communicationData 
          },
          $set: { 
            updatedAt: new Date().toISOString() 
          }
        }
      );

      if (result.matchedCount === 0) {
        return { success: false, error: 'Ticket not found' };
      }

      if (result.modifiedCount === 0) {
        return { success: false, error: 'Failed to add communication' };
      }

      return { success: true };
    } catch (error) {
      console.error('Database error adding communication:', error);
      return { success: false, error: error.message };
    }
  }
}