/**
 * Ticket Business Rules Model - Business Logic Validation
 * Constitutional Architecture: Model Layer - Business Rules  
 * Responsibility: Business rules enforcement and status transitions
 */

import { getInternalStatusInfo, isStatusTransitionAllowed } from '@/config/statuses/index.js';
import { db } from '@/lib/database.js';

export default class TicketBusinessRulesModel {
  /**
   * Validate status transition
   */
  static async validateStatusTransition(ticketId, newStatus) {
    try {
      // Get current ticket
      const collection = await db.dbCustomTickets();
      const ticket = await collection.findOne({
        $or: [
          { ticketID: ticketId },
          { _id: ticketId }
        ]
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      const currentStatus = ticket.status;

      // Check if transition is allowed
      if (!isStatusTransitionAllowed(currentStatus, newStatus)) {
        throw new Error(`Invalid status transition from "${currentStatus}" to "${newStatus}"`);
      }

      // Get status info to ensure it exists
      const statusInfo = getInternalStatusInfo(newStatus);
      if (!statusInfo) {
        throw new Error(`Invalid status: "${newStatus}"`);
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Apply business rules during ticket creation
   */
  static async applyCreationBusinessRules(ticketData) {
    const processedData = { ...ticketData };

    // Auto-generate ticket ID if not provided
    if (!processedData.ticketID) {
      processedData.ticketID = await this.generateTicketID();
    }

    // Set default status if not provided
    if (!processedData.status) {
      processedData.status = 'submitted';
    }

    // Set default priority if not provided
    if (!processedData.priority) {
      processedData.priority = 'normal';
    }

    // Set default type if not provided
    if (!processedData.type) {
      processedData.type = 'custom-design';
    }

    // Initialize arrays
    processedData.communications = processedData.communications || [];
    processedData.notes = processedData.notes || [];
    processedData.clientFeedback = processedData.clientFeedback || [];
    processedData.adminNotes = processedData.adminNotes || [];
    processedData.files = processedData.files || { moodBoard: [], designFiles: [] };

    // Set financial defaults
    processedData.quoteTotal = processedData.quoteTotal || 0;
    processedData.amountOwedToCard = processedData.amountOwedToCard || 0;

    // Set timestamps
    processedData.createdAt = new Date();
    processedData.updatedAt = new Date();

    return processedData;
  }

  /**
   * Apply business rules during ticket updates
   */
  static async applyUpdateBusinessRules(updateData) {
    console.log('🔄 TicketBusinessRulesModel.applyUpdateBusinessRules - Input:', {
      updateData,
      dataKeys: Object.keys(updateData),
      centerstone: updateData.centerstone
    });

    const processedData = { ...updateData };

    // Always update the updatedAt timestamp
    processedData.updatedAt = new Date();

    // Status-specific business rules
    if (processedData.status) {
      switch (processedData.status) {
        case 'in-progress':
          if (!processedData.startedAt) {
            processedData.startedAt = new Date();
          }
          break;
        case 'completed':
          processedData.completedAt = new Date();
          break;
        case 'cancelled':
          processedData.cancelledAt = new Date();
          break;
      }
    }

    console.log('✅ TicketBusinessRulesModel.applyUpdateBusinessRules - Output:', {
      processedData,
      processedDataKeys: Object.keys(processedData),
      centerstone: processedData.centerstone
    });

    return processedData;
  }

  /**
   * Validate if ticket can be deleted
   */
  static async validateDeletion(ticketId) {
    try {
      const collection = await db.dbCustomTickets();
      const ticket = await collection.findOne({
        $or: [
          { ticketID: ticketId },
          { _id: ticketId }
        ]
      });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Business rules for deletion
      const nonDeletableStatuses = ['in-progress', 'completed', 'shipped'];
      if (nonDeletableStatuses.includes(ticket.status)) {
        throw new Error(`Cannot delete ticket with status "${ticket.status}"`);
      }

      // Check if ticket has associated orders
      if (ticket.shopifyOrders && ticket.shopifyOrders.length > 0) {
        throw new Error('Cannot delete ticket with associated Shopify orders');
      }

      // Check if ticket has payments
      if (ticket.paymentReceived || (ticket.quoteTotal && ticket.quoteTotal > 0)) {
        throw new Error('Cannot delete ticket with payments or quotes');
      }

      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate unique ticket ID
   */
  static async generateTicketID() {
    const prefix = 'ticket-';
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Check if ticket is editable
   */
  static isTicketEditable(ticket) {
    const nonEditableStatuses = ['completed', 'cancelled', 'archived'];
    return !nonEditableStatuses.includes(ticket.status);
  }

  /**
   * Check if status allows modifications
   */
  static canModifyStatus(currentStatus, userRole = 'admin') {
    if (userRole !== 'admin') {
      // Non-admin users can only modify certain statuses
      const allowedStatuses = ['submitted', 'in-consultation'];
      return allowedStatuses.includes(currentStatus);
    }
    return true;
  }

  /**
   * Validate communication data
   */
  static validateCommunication(communicationData) {
    const errors = [];

    // Required fields
    if (!communicationData.message || !communicationData.message.trim()) {
      errors.push('Message content is required');
    }

    if (!communicationData.type) {
      errors.push('Communication type is required');
    }

    if (!communicationData.from) {
      errors.push('Sender is required');
    }

    if (!communicationData.to) {
      errors.push('Recipient is required');
    }

    // Validate type
    const validTypes = ['chat', 'email', 'phone', 'in-person'];
    if (communicationData.type && !validTypes.includes(communicationData.type)) {
      errors.push('Invalid communication type');
    }

    // Validate message length
    if (communicationData.message && communicationData.message.length > 5000) {
      errors.push('Message is too long (max 5000 characters)');
    }

    // Validate sender/recipient
    const validSenders = ['admin', 'client', 'system'];
    if (communicationData.from && !validSenders.includes(communicationData.from)) {
      errors.push('Invalid sender');
    }

    if (communicationData.to && !validSenders.includes(communicationData.to)) {
      errors.push('Invalid recipient');
    }

    return {
      isValid: errors.length === 0,
      errors,
      error: errors.length > 0 ? errors[0] : null
    };
  }
}