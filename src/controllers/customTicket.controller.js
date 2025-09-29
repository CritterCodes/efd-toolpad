/**
 * Custom Ticket Data Controller
 * Database operations for custom tickets - follows constitutional architecture
 */

import { db } from '@/lib/database';

export class CustomTicketController {
  /**
   * Fetch all custom tickets with filters
   */
  static async getAllTickets(filters = {}) {
    try {
      const database = await db.connect();
      const collection = database.collection('customTickets');
      
      const query = this.buildDatabaseQuery(filters);
      const tickets = await collection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      
      return {
        success: true,
        tickets,
        totalCount: tickets.length
      };
    } catch (error) {
      console.error('Controller error fetching tickets:', error);
      throw error;
    }
  }

  /**
   * Fetch single ticket by ID
   */
  static async getTicketById(ticketId) {
    try {
      const database = await db.connect();
      const collection = database.collection('customTickets');
      
      const ticket = await collection.findOne({ ticketID: ticketId });
      
      if (!ticket) {
        throw new Error('Ticket not found');
      }
      
      return { success: true, ticket };
    } catch (error) {
      console.error('Controller error fetching ticket by ID:', error);
      throw error;
    }
  }

  /**
   * Create new custom ticket
   */
  static async createTicket(ticketData) {
    try {
      const database = await db.connect();
      const collection = database.collection('customTickets');
      
      const ticket = {
        ...ticketData,
        createdAt: new Date(),
        updatedAt: new Date(),
        statusHistory: [{
          status: ticketData.status || 'pending',
          changedAt: new Date(),
          changedBy: ticketData.createdBy || 'system'
        }]
      };
      
      const result = await collection.insertOne(ticket);
      const createdTicket = await collection.findOne({ _id: result.insertedId });
      
      return { success: true, ticket: createdTicket };
    } catch (error) {
      console.error('Controller error creating ticket:', error);
      throw error;
    }
  }

  /**
   * Update ticket status with history tracking
   */
  static async updateTicketStatus(ticketId, newStatus, changedBy = 'system') {
    try {
      const database = await db.connect();
      const collection = database.collection('customTickets');
      
      // Get current ticket to validate transition
      const currentTicket = await collection.findOne({ ticketID: ticketId });
      if (!currentTicket) {
        throw new Error('Ticket not found');
      }
      
      // Update with status history
      const updateData = {
        status: newStatus,
        updatedAt: new Date(),
        $push: {
          statusHistory: {
            status: newStatus,
            changedAt: new Date(),
            changedBy,
            previousStatus: currentTicket.status
          }
        }
      };
      
      const result = await collection.updateOne(
        { ticketID: ticketId },
        updateData
      );
      
      if (result.matchedCount === 0) {
        throw new Error('Ticket not found');
      }
      
      const updatedTicket = await collection.findOne({ ticketID: ticketId });
      return { success: true, ticket: updatedTicket };
    } catch (error) {
      console.error('Controller error updating status:', error);
      throw error;
    }
  }

  /**
   * Update ticket financials
   */
  static async updateTicketFinancials(ticketId, financialData) {
    try {
      const database = await db.connect();
      const collection = database.collection('customTickets');
      
      const updateData = {
        ...financialData,
        updatedAt: new Date()
      };
      
      const result = await collection.updateOne(
        { ticketID: ticketId },
        { $set: updateData }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('Ticket not found');
      }
      
      const updatedTicket = await collection.findOne({ ticketID: ticketId });
      return { success: true, ticket: updatedTicket };
    } catch (error) {
      console.error('Controller error updating financials:', error);
      throw error;
    }
  }

  /**
   * Link Shopify order to ticket
   */
  static async linkShopifyOrder(ticketId, orderType, orderId) {
    try {
      const database = await db.connect();
      const collection = database.collection('customTickets');
      
      const fieldName = orderType === 'deposit' 
        ? 'shopifyDepositOrderId' 
        : 'shopifyFinalOrderId';
      
      const result = await collection.updateOne(
        { ticketID: ticketId },
        { 
          $set: { 
            [fieldName]: orderId,
            updatedAt: new Date()
          } 
        }
      );
      
      if (result.matchedCount === 0) {
        throw new Error('Ticket not found');
      }
      
      const updatedTicket = await collection.findOne({ ticketID: ticketId });
      return { success: true, ticket: updatedTicket };
    } catch (error) {
      console.error('Controller error linking Shopify order:', error);
      throw error;
    }
  }

  /**
   * Delete ticket
   */
  static async deleteTicket(ticketId) {
    try {
      const database = await db.connect();
      const collection = database.collection('customTickets');
      
      const result = await collection.deleteOne({ ticketID: ticketId });
      
      if (result.deletedCount === 0) {
        throw new Error('Ticket not found');
      }
      
      return { success: true };
    } catch (error) {
      console.error('Controller error deleting ticket:', error);
      throw error;
    }
  }

  /**
   * Get financial summary
   */
  static async getFinancialSummary(filters = {}) {
    try {
      const database = await db.connect();
      const collection = database.collection('customTickets');
      
      const query = this.buildDatabaseQuery(filters);
      
      const pipeline = [
        { $match: query },
        {
          $group: {
            _id: null,
            totalOutstanding: {
              $sum: {
                $subtract: ['$amountOwedToCard', { $ifNull: ['$amountPaidToCard', 0] }]
              }
            },
            totalReimbursed: { $sum: { $ifNull: ['$amountPaidToCard', 0] } },
            totalQuoteValue: { $sum: { $ifNull: ['$quoteTotal', 0] } },
            pendingDepositOrders: {
              $sum: {
                $cond: [
                  { $and: [
                    { $eq: ['$shopifyDepositOrderId', null] },
                    { $eq: ['$paymentReceived', true] }
                  ]},
                  1,
                  0
                ]
              }
            },
            pendingFinalOrders: {
              $sum: {
                $cond: [
                  { $and: [
                    { $eq: ['$shopifyFinalOrderId', null] },
                    { $ne: ['$shopifyDepositOrderId', null] }
                  ]},
                  1,
                  0
                ]
              }
            }
          }
        }
      ];

      const result = await collection.aggregate(pipeline).toArray();
      
      const summary = result.length > 0 ? result[0] : {
        totalOutstanding: 0,
        totalReimbursed: 0,
        totalQuoteValue: 0,
        pendingDepositOrders: 0,
        pendingFinalOrders: 0
      };
      
      return { success: true, summary };
    } catch (error) {
      console.error('Controller error getting financial summary:', error);
      throw error;
    }
  }

  // Helper method to build database query from filters
  static buildDatabaseQuery(filters) {
    const query = {};
    
    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.paymentReceived !== undefined) {
      query.paymentReceived = filters.paymentReceived;
    }
    if (filters.cardPaymentStatus) {
      query.cardPaymentStatus = filters.cardPaymentStatus;
    }
    if (filters.hasShopifyOrders) {
      query.$or = [
        { shopifyDepositOrderId: { $exists: true, $ne: null } },
        { shopifyFinalOrderId: { $exists: true, $ne: null } }
      ];
    }
    if (filters.dateFrom || filters.dateTo) {
      query.createdAt = {};
      if (filters.dateFrom) query.createdAt.$gte = new Date(filters.dateFrom);
      if (filters.dateTo) query.createdAt.$lte = new Date(filters.dateTo);
    }
    
    return query;
  }
}

export default CustomTicketController;