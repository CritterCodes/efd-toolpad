/**
 * Custom Ticket Model - MVC Architecture
 * Independent microservice data model
 */

export class CustomTicketModel {
  constructor() {
    this.collection = 'customTickets';
  }

  /**
   * Create a new custom ticket
   */
  static createTicket(ticketData) {
    return {
      ticketID: ticketData.ticketID || this.generateTicketID(),
      title: ticketData.title || '',
      type: ticketData.type || 'custom-design',
      status: ticketData.status || 'pending',
      priority: ticketData.priority || 'normal',
      
      // Customer information
      customerName: ticketData.customerName || '',
      customerEmail: ticketData.customerEmail || '',
      customerPhone: ticketData.customerPhone || '',
      
      // Ticket details
      description: ticketData.description || '',
      requirements: ticketData.requirements || [],
      images: ticketData.images || [],
      
      // Financial data
      materialCosts: ticketData.materialCosts || [],
      laborCost: ticketData.laborCost || 0,
      laborHours: ticketData.laborHours || 0,
      castingCost: ticketData.castingCost || 0,
      shippingCost: ticketData.shippingCost || 0,
      designFee: ticketData.designFee || 100,
      quoteTotal: ticketData.quoteTotal || 0,
      
      // Status tracking
      isRush: ticketData.isRush || false,
      needsAttention: false,
      paymentReceived: ticketData.paymentReceived || false,
      depositPaid: ticketData.depositPaid || false,
      
      // Shopify integration
      shopifyDepositOrderId: ticketData.shopifyDepositOrderId || null,
      shopifyFinalOrderId: ticketData.shopifyFinalOrderId || null,
      
      // Notes and communication
      notes: ticketData.notes || [],
      statusHistory: [{
        status: ticketData.status || 'pending',
        changedAt: new Date(),
        changedBy: ticketData.createdBy || 'system',
        reason: 'Ticket created'
      }],
      
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
      dueDate: ticketData.dueDate || null,
      estimatedCompletion: ticketData.estimatedCompletion || null
    };
  }

  /**
   * Apply business rules to ticket data
   */
  static applyBusinessRules(ticket) {
    return {
      ...ticket,
      // Calculate priority based on status and age
      priority: this.calculatePriority(ticket),
      // Determine if needs attention
      needsAttention: this.requiresAttention(ticket),
      // Calculate days in current status
      daysInStatus: this.calculateDaysInStatus(ticket),
      // Calculate estimated completion
      estimatedCompletion: this.calculateEstimatedCompletion(ticket)
    };
  }

  /**
   * Validate ticket data structure
   */
  static validateTicket(ticketData) {
    const errors = [];
    
    if (!ticketData.customerName) {
      errors.push('Customer name is required');
    }
    
    if (!ticketData.customerEmail) {
      errors.push('Customer email is required');
    }
    
    if (!ticketData.type) {
      errors.push('Ticket type is required');
    }
    
    if (!ticketData.title && !ticketData.description) {
      errors.push('Either title or description is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate unique ticket ID
   */
  static generateTicketID() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `CT-${timestamp}-${random}`.toUpperCase();
  }

  /**
   * Calculate priority based on business rules
   */
  static calculatePriority(ticket) {
    const createdDays = this.getDaysAgo(ticket.createdAt);
    
    // High priority conditions
    if (ticket.isRush) return 'high';
    if (ticket.status === 'waiting-for-client' && createdDays > 14) return 'medium';
    if (ticket.status !== 'completed' && createdDays > 30) return 'high';
    
    return ticket.priority || 'normal';
  }

  /**
   * Determine if ticket requires attention
   */
  static requiresAttention(ticket) {
    const daysInStatus = this.calculateDaysInStatus(ticket);
    
    // Attention required conditions
    if (ticket.status === 'pending' && daysInStatus > 2) return true;
    if (ticket.status === 'waiting-for-client' && daysInStatus > 10) return true;
    if (ticket.status === 'in-production' && daysInStatus > 21) return true;
    if (ticket.depositRequired && !ticket.depositPaid) return true;
    
    return false;
  }

  /**
   * Calculate days in current status
   */
  static calculateDaysInStatus(ticket) {
    if (!ticket.statusHistory || ticket.statusHistory.length === 0) {
      return this.getDaysAgo(ticket.createdAt);
    }
    
    const lastStatusChange = ticket.statusHistory[ticket.statusHistory.length - 1];
    return this.getDaysAgo(lastStatusChange.changedAt);
  }

  /**
   * Calculate estimated completion date
   */
  static calculateEstimatedCompletion(ticket) {
    const statusDays = {
      'pending': 2,
      'reviewing-request': 1,
      'client-consultation': 3,
      'sketching': 5,
      'in-cad': 7,
      'preparing-quote': 2,
      'in-production': 14,
      'quality-control': 2,
      'shipping': 3
    };
    
    const baseDays = statusDays[ticket.status] || 7;
    const rushMultiplier = ticket.isRush ? 0.5 : 1;
    const estimatedDays = Math.ceil(baseDays * rushMultiplier);
    
    const completionDate = new Date();
    completionDate.setDate(completionDate.getDate() + estimatedDays);
    
    return completionDate;
  }

  /**
   * Helper: Get days ago from date
   */
  static getDaysAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    return Math.floor((now - date) / (1000 * 60 * 60 * 24));
  }

  /**
   * Serialize ticket for API response
   */
  static serialize(ticket) {
    return {
      id: ticket._id,
      ticketID: ticket.ticketID,
      title: ticket.title,
      type: ticket.type,
      status: ticket.status,
      priority: ticket.priority,
      customerName: ticket.customerName,
      customerEmail: ticket.customerEmail,
      customerPhone: ticket.customerPhone,
      description: ticket.description,
      requirements: ticket.requirements,
      images: ticket.images,
      materialCosts: ticket.materialCosts,
      laborCost: ticket.laborCost,
      laborHours: ticket.laborHours,
      quoteTotal: ticket.quoteTotal,
      isRush: ticket.isRush,
      needsAttention: ticket.needsAttention,
      paymentReceived: ticket.paymentReceived,
      depositPaid: ticket.depositPaid,
      notes: ticket.notes,
      statusHistory: ticket.statusHistory,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      dueDate: ticket.dueDate,
      estimatedCompletion: ticket.estimatedCompletion,
      daysInStatus: ticket.daysInStatus
    };
  }
}

export default CustomTicketModel;