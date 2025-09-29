/**
 * Ticket CRUD Service - Core Ticket Operations
 * Constitutional Architecture: Business Logic Layer
 * Responsibility: Ticket CRUD operations and business logic
 */

import DatabaseService from './DatabaseService.js';
import CustomerService from './CustomerService.js';

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

export class TicketCRUDService {
  /**
   * Get all tickets with filters and pagination
   */
  static async getAllTickets(filters = {}) {
    try {
      const collection = DatabaseService.getTicketsCollection();
      const {
        page = 1,
        limit = 50,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        ...searchFilters
      } = filters;

      // Build MongoDB query
      const query = {};

      // Type filter
      if (searchFilters.type) {
        query.type = searchFilters.type;
      }

      // Status filter
      if (searchFilters.status) {
        query.status = searchFilters.status;
      }

      // Priority filter
      if (searchFilters.priority) {
        query.priority = searchFilters.priority;
      }

      // Payment filters with proper boolean handling
      if (searchFilters.paymentReceived !== undefined) {
        query.$or = [
          { paymentReceived: searchFilters.paymentReceived },
          { paymentReceived: { $exists: false } }
        ];
      }

      // Card payment status filter
      if (searchFilters.cardPaymentStatus) {
        query.cardPaymentStatus = searchFilters.cardPaymentStatus;
      }

      // Shopify orders filter with proper boolean handling
      if (searchFilters.hasShopifyOrders !== undefined) {
        query.$or = [
          { 'shopifyOrders.0': { $exists: searchFilters.hasShopifyOrders } },
          { shopifyOrders: { $exists: false } }
        ];
      }

      // Date range filter
      if (searchFilters.dateFrom || searchFilters.dateTo) {
        query.createdAt = {};
        if (searchFilters.dateFrom) {
          query.createdAt.$gte = new Date(searchFilters.dateFrom);
        }
        if (searchFilters.dateTo) {
          query.createdAt.$lte = new Date(searchFilters.dateTo);
        }
      }

      // Calculate pagination
      const skip = (page - 1) * limit;
      const sortOptions = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Execute queries in parallel
      const [tickets, totalCount] = await Promise.all([
        collection.find(query)
          .sort(sortOptions)
          .skip(skip)
          .limit(limit)
          .toArray(),
        collection.countDocuments(query)
      ]);

      // Enrich tickets with customer data
      const enrichedTickets = await CustomerService.enrichTicketsWithCustomers(tickets);

      return {
        tickets: enrichedTickets,
        totalCount,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalCount / limit),
          hasNextPage: page < Math.ceil(totalCount / limit),
          hasPreviousPage: page > 1
        }
      };
    } catch (error) {
      logger.error('Error fetching tickets:', error);
      throw error;
    }
  }

  /**
   * Get ticket by ID
   */
  static async getTicketById(ticketId) {
    try {
      const collection = DatabaseService.getTicketsCollection();
      const ticket = await collection.findOne({ 
        $or: [
          { ticketID: ticketId },
          { _id: ticketId }
        ]
      });

      if (!ticket) {
        return null;
      }

      // Enrich with customer data
      const enrichedTicket = await CustomerService.enrichTicketWithCustomer(ticket);
      return enrichedTicket;
    } catch (error) {
      logger.error('Error fetching ticket by ID:', error);
      throw error;
    }
  }

  /**
   * Create new ticket
   */
  static async createTicket(ticketData) {
    try {
      const collection = DatabaseService.getTicketsCollection();
      
      const ticket = {
        ...ticketData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await collection.insertOne(ticket);
      const createdTicket = await collection.findOne({ _id: result.insertedId });
      
      // Enrich with customer data
      const enrichedTicket = await CustomerService.enrichTicketWithCustomer(createdTicket);
      
      logger.info('Ticket created successfully', { ticketId: enrichedTicket.ticketID });
      return enrichedTicket;
    } catch (error) {
      logger.error('Error creating ticket:', error);
      throw error;
    }
  }

  /**
   * Update ticket
   */
  static async updateTicket(ticketId, updateData) {
    try {
      console.log('🔄 [EMBEDDED] TicketCRUDService.updateTicket - Starting:', {
        ticketId,
        updateData,
        dataKeys: Object.keys(updateData),
        centerstone: updateData.centerstone,
        hasQuoteTotal: !!updateData.quoteTotal,
        hasAnalytics: !!updateData.analytics,
        updateDataStringified: JSON.stringify(updateData, null, 2)
      });

      const collection = DatabaseService.getTicketsCollection();
      
      const update = {
        ...updateData,
        updatedAt: new Date()
      };

      console.log('🔄 [EMBEDDED] TicketCRUDService.updateTicket - Final update object:', {
        update,
        updateKeys: Object.keys(update),
        centerstone: update.centerstone,
        finalUpdateStringified: JSON.stringify(update, null, 2)
      });

      const result = await collection.updateOne(
        { 
          $or: [
            { ticketID: ticketId },
            { _id: ticketId }
          ]
        },
        { $set: update }
      );

      console.log('🔄 [EMBEDDED] TicketCRUDService.updateTicket - Database update result:', {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        acknowledged: result.acknowledged
      });

      if (result.matchedCount === 0) {
        throw new Error('Ticket not found');
      }

      const updatedTicket = await this.getTicketById(ticketId);
      
      console.log('✅ [EMBEDDED] TicketCRUDService.updateTicket - Final updated ticket:', {
        updatedTicket,
        hasTicket: !!updatedTicket,
        ticketKeys: updatedTicket ? Object.keys(updatedTicket) : [],
        centerstone: updatedTicket?.centerstone,
        quoteTotal: updatedTicket?.quoteTotal,
        analytics: updatedTicket?.analytics
      });
      
      logger.info('Ticket updated successfully', { ticketId });
      return updatedTicket;
    } catch (error) {
      console.error('❌ [EMBEDDED] TicketCRUDService.updateTicket error:', error);
      logger.error('Error updating ticket:', error);
      throw error;
    }
  }

  /**
   * Delete ticket
   */
  static async deleteTicket(ticketId) {
    try {
      const collection = DatabaseService.getTicketsCollection();
      
      const result = await collection.deleteOne({
        $or: [
          { ticketID: ticketId },
          { _id: ticketId }
        ]
      });

      if (result.deletedCount === 0) {
        throw new Error('Ticket not found');
      }

      logger.info('Ticket deleted successfully', { ticketId });
      return { success: true, ticketId };
    } catch (error) {
      logger.error('Error deleting ticket:', error);
      throw error;
    }
  }
}

export default TicketCRUDService;