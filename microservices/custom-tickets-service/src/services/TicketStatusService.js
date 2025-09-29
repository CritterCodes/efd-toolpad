/**
 * Ticket Status Service - Status Management Operations
 * Constitutional Architecture: Business Logic Layer
 * Responsibility: Status updates and tracking logic
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

export class TicketStatusService {
  /**
   * Update ticket status with proper tracking
   */
  static async updateTicketStatus(ticketId, newStatus, reason = '') {
    try {
      const collection = DatabaseService.getTicketsCollection();
      
      // First, get the current ticket to preserve history
      const currentTicket = await collection.findOne({
        $or: [
          { ticketID: ticketId },
          { _id: ticketId }
        ]
      });

      if (!currentTicket) {
        throw new Error('Ticket not found');
      }

      // Create status history entry
      const statusHistory = currentTicket.statusHistory || [];
      const statusUpdate = {
        from: currentTicket.status,
        to: newStatus,
        timestamp: new Date(),
        reason: reason || `Status changed from ${currentTicket.status} to ${newStatus}`,
        updatedBy: 'system' // This could be enhanced to track actual user
      };

      statusHistory.push(statusUpdate);

      // Prepare update object
      const update = {
        status: newStatus,
        statusHistory,
        updatedAt: new Date()
      };

      // Add specific status-based updates
      switch (newStatus) {
        case 'completed':
          update.completedAt = new Date();
          break;
        case 'in-progress':
          if (!currentTicket.startedAt) {
            update.startedAt = new Date();
          }
          break;
        case 'cancelled':
          update.cancelledAt = new Date();
          update.cancellationReason = reason || 'Cancelled by system';
          break;
        case 'on-hold':
          update.onHoldReason = reason || 'Put on hold';
          break;
      }

      // Update the ticket
      const result = await collection.updateOne(
        { 
          $or: [
            { ticketID: ticketId },
            { _id: ticketId }
          ]
        },
        { $set: update }
      );

      if (result.matchedCount === 0) {
        throw new Error('Ticket not found during update');
      }

      // Get updated ticket with customer data
      const updatedTicket = await collection.findOne({
        $or: [
          { ticketID: ticketId },
          { _id: ticketId }
        ]
      });

      const enrichedTicket = await CustomerService.enrichTicketWithCustomer(updatedTicket);

      logger.info('Ticket status updated successfully', { 
        ticketId, 
        from: currentTicket.status, 
        to: newStatus,
        reason 
      });

      return enrichedTicket;
    } catch (error) {
      logger.error('Error updating ticket status:', error);
      throw error;
    }
  }

  /**
   * Get ticket status history
   */
  static async getTicketStatusHistory(ticketId) {
    try {
      const collection = DatabaseService.getTicketsCollection();
      
      const ticket = await collection.findOne(
        { 
          $or: [
            { ticketID: ticketId },
            { _id: ticketId }
          ]
        },
        { projection: { statusHistory: 1, status: 1, ticketID: 1 } }
      );

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      return {
        ticketId: ticket.ticketID,
        currentStatus: ticket.status,
        history: ticket.statusHistory || []
      };
    } catch (error) {
      logger.error('Error fetching ticket status history:', error);
      throw error;
    }
  }

  /**
   * Get status statistics
   */
  static async getStatusStatistics() {
    try {
      const collection = DatabaseService.getTicketsCollection();
      
      const pipeline = [
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            avgProcessingTime: {
              $avg: {
                $cond: {
                  if: { $and: ['$completedAt', '$createdAt'] },
                  then: { $subtract: ['$completedAt', '$createdAt'] },
                  else: null
                }
              }
            }
          }
        },
        {
          $sort: { count: -1 }
        }
      ];

      const stats = await collection.aggregate(pipeline).toArray();
      
      // Calculate total tickets
      const totalTickets = stats.reduce((sum, stat) => sum + stat.count, 0);
      
      return {
        statusBreakdown: stats,
        totalTickets,
        timestamp: new Date()
      };
    } catch (error) {
      logger.error('Error calculating status statistics:', error);
      throw error;
    }
  }
}

export default TicketStatusService;