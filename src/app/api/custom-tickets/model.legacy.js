/**
 * Custom Tickets Model - Backend Data Access and Validation
 * Constitutional Architecture: Model Layer
 * Responsibility: Data validation, database operations, business rules
 */

import { db } from '@/lib/database.js';
import { getInternalStatusInfo, isStatusTransitionAllowed } from '@/config/statuses/index.js';

export default class CustomTicketModel {
  static collection = 'customTickets';

  /**
   * Validate ticket ID format
   */
  static async validateTicketId(ticketId) {
    if (!ticketId) {
      throw new Error('Ticket ID is required');
    }

    if (typeof ticketId !== 'string') {
      throw new Error('Ticket ID must be a string');
    }

    if (ticketId.length < 3) {
      throw new Error('Ticket ID must be at least 3 characters');
    }

    return true;
  }

  /**
   * Validate ticket creation data
   */
  static async validateTicketData(ticketData) {
    const errors = [];

    // Required fields validation
    if (!ticketData.title || typeof ticketData.title !== 'string') {
      errors.push('Title is required and must be a string');
    }

    if (!ticketData.customerName || typeof ticketData.customerName !== 'string') {
      errors.push('Customer name is required and must be a string');
    }

    if (!ticketData.customerEmail || typeof ticketData.customerEmail !== 'string') {
      errors.push('Customer email is required and must be a string');
    }

    // Email format validation
    if (ticketData.customerEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(ticketData.customerEmail)) {
        errors.push('Customer email must be a valid email address');
      }
    }

    // Optional field validation
    if (ticketData.customerPhone && typeof ticketData.customerPhone !== 'string') {
      errors.push('Customer phone must be a string');
    }

    if (ticketData.description && typeof ticketData.description !== 'string') {
      errors.push('Description must be a string');
    }

    // Status validation
    if (ticketData.status) {
      const statusInfo = getInternalStatusInfo(ticketData.status);
      if (!statusInfo) {
        errors.push(`Invalid status: ${ticketData.status}`);
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation errors: ${errors.join(', ')}`);
    }

    return ticketData;
  }

  /**
   * Validate ticket update data
   */
  static async validateUpdateData(updateData) {
    if (!updateData || typeof updateData !== 'object') {
      throw new Error('Update data must be an object');
    }

    // Validate individual fields if present
    if (updateData.title && typeof updateData.title !== 'string') {
      throw new Error('Title must be a string');
    }

    if (updateData.customerEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.customerEmail)) {
        throw new Error('Customer email must be a valid email address');
      }
    }

    if (updateData.status) {
      const statusInfo = getInternalStatusInfo(updateData.status);
      if (!statusInfo) {
        throw new Error(`Invalid status: ${updateData.status}`);
      }
    }

    return updateData;
  }

  /**
   * Validate status transition
   */
  static async validateStatusTransition(ticketId, newStatus) {
    try {
      // Get current ticket to check current status
      const database = await db.connect();
      const collection = database.collection(this.collection);
      const ticket = await collection.findOne({ ticketID: ticketId });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Validate status transition
      const isValid = isStatusTransitionAllowed(ticket.status, newStatus);
      if (!isValid) {
        throw new Error(`Cannot transition from ${ticket.status} to ${newStatus}`);
      }

      return true;
    } catch (error) {
      throw new Error(`Status transition validation failed: ${error.message}`);
    }
  }

  /**
   * Validate order data for Shopify orders
   */
  static async validateOrderData(orderData) {
    if (!orderData || typeof orderData !== 'object') {
      throw new Error('Order data must be an object');
    }

    if (!orderData.amount || typeof orderData.amount !== 'number') {
      throw new Error('Order amount is required and must be a number');
    }

    if (orderData.amount <= 0) {
      throw new Error('Order amount must be greater than zero');
    }

    return orderData;
  }

  /**
   * Apply business rules for ticket creation
   */
  static async applyCreationBusinessRules(ticketData) {
    const processedData = { ...ticketData };

    // Set default values
    processedData.status = processedData.status || 'pending';
    processedData.priority = processedData.priority || 'normal';
    processedData.type = processedData.type || 'custom-design';
    processedData.createdAt = new Date();
    processedData.updatedAt = new Date();

    // Generate ticket ID if not provided
    if (!processedData.ticketID) {
      processedData.ticketID = await this.generateTicketID();
    }

    // Initialize empty arrays for collections
    processedData.images = processedData.images || [];
    processedData.materials = processedData.materials || [];
    processedData.statusHistory = processedData.statusHistory || [];
    processedData.shopifyOrders = processedData.shopifyOrders || [];

    // Initialize financial fields
    processedData.materialCosts = processedData.materialCosts || [];
    processedData.laborCost = processedData.laborCost || 0;
    processedData.laborHours = processedData.laborHours || 0;
    processedData.castingCost = processedData.castingCost || 0;
    processedData.totalCost = processedData.totalCost || 0;
    processedData.quotedPrice = processedData.quotedPrice || 0;

    // Initialize payment tracking
    processedData.paymentReceived = processedData.paymentReceived || false;
    processedData.depositAmount = processedData.depositAmount || 0;
    processedData.finalAmount = processedData.finalAmount || 0;

    return processedData;
  }

  /**
   * Apply business rules for ticket updates
   */
  static async applyUpdateBusinessRules(updateData) {
    const processedData = { ...updateData };
    
    // Always update the modification timestamp
    processedData.updatedAt = new Date();

    // If status is being updated, add to status history
    if (processedData.status) {
      const statusEntry = {
        status: processedData.status,
        changedAt: new Date(),
        changedBy: processedData.changedBy || 'system'
      };

      // Add to status history (will be merged with existing)
      processedData.$push = processedData.$push || {};
      processedData.$push.statusHistory = statusEntry;
    }

    return processedData;
  }

  /**
   * Validate if ticket can be deleted
   */
  static async validateDeletion(ticketId) {
    try {
      const database = await db.connect();
      const collection = database.collection(this.collection);
      const ticket = await collection.findOne({ ticketID: ticketId });

      if (!ticket) {
        throw new Error('Ticket not found');
      }

      // Business rule: Cannot delete tickets with orders
      if (ticket.shopifyOrders && ticket.shopifyOrders.length > 0) {
        throw new Error('Cannot delete ticket with associated Shopify orders');
      }

      // Business rule: Cannot delete completed tickets
      if (ticket.status === 'completed' || ticket.status === 'picked-up') {
        throw new Error('Cannot delete completed tickets');
      }

      return true;
    } catch (error) {
      throw new Error(`Deletion validation failed: ${error.message}`);
    }
  }

  /**
   * Generate unique ticket ID
   */
  static async generateTicketID() {
    const timestamp = Date.now().toString();
    const randomSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CT-${timestamp.slice(-6)}-${randomSuffix}`;
  }

  /**
   * Database connection helper
   */
  static async getCollection() {
    const database = await db.connect();
    return database.collection(this.collection);
  }

  /**
   * Find ticket by ID
   */
  static async findById(ticketId) {
    try {
      const collection = await this.getCollection();
      const ticket = await collection.findOne({ ticketID: ticketId });
      return ticket;
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Create ticket in database
   */
  static async create(ticketData) {
    try {
      const collection = await this.getCollection();
      const result = await collection.insertOne(ticketData);
      
      if (!result.insertedId) {
        throw new Error('Failed to create ticket in database');
      }

      return await collection.findOne({ _id: result.insertedId });
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Update ticket in database
   */
  static async updateById(ticketId, updateData) {
    try {
      const collection = await this.getCollection();
      const result = await collection.updateOne(
        { ticketID: ticketId },
        { $set: updateData }
      );

      if (result.matchedCount === 0) {
        throw new Error('Ticket not found');
      }

      return await collection.findOne({ ticketID: ticketId });
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }

  /**
   * Delete ticket from database
   */
  static async deleteById(ticketId) {
    try {
      const collection = await this.getCollection();
      const result = await collection.deleteOne({ ticketID: ticketId });

      if (result.deletedCount === 0) {
        throw new Error('Ticket not found');
      }

      return { success: true };
    } catch (error) {
      throw new Error(`Database error: ${error.message}`);
    }
  }
}