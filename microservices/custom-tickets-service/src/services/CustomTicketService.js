/**
 * Custom Tickets Service - MVC Architecture
 * Constitutional Architecture: Main Service Coordinator
 * Responsibility: Service orchestration and public API
 */

import DatabaseService from './DatabaseService.js';
import CustomerService from './CustomerService.js';
import TicketCRUDService from './TicketCRUDService.js';
import TicketStatusService from './TicketStatusService.js';
import TicketAnalyticsService from './TicketAnalyticsService.js';

export class CustomTicketService {
  /**
   * Initialize all services
   */
  static async initializeDatabase() {
    return await DatabaseService.initializeDatabase();
  }

  /**
   * Get database collection (for backward compatibility)
   */
  static getCollection() {
    return DatabaseService.getTicketsCollection();
  }

  // ===== TICKET CRUD OPERATIONS =====

  /**
   * Get all tickets with filters and pagination
   */
  static async getAllTickets(filters = {}) {
    return await TicketCRUDService.getAllTickets(filters);
  }

  /**
   * Get ticket by ID
   */
  static async getTicketById(ticketId) {
    return await TicketCRUDService.getTicketById(ticketId);
  }

  /**
   * Create new ticket
   */
  static async createTicket(ticketData) {
    return await TicketCRUDService.createTicket(ticketData);
  }

    /**
   * Update ticket data
   */
  static async updateTicket(ticketId, updateData) {
    console.log('🔄 [EMBEDDED] CustomTicketService.updateTicket - Starting:', {
      ticketId,
      updateData,
      dataKeys: Object.keys(updateData),
      centerstone: updateData.centerstone,
      hasQuoteTotal: !!updateData.quoteTotal,
      hasAnalytics: !!updateData.analytics
    });

    const result = await TicketCRUDService.updateTicket(ticketId, updateData);
    
    console.log('✅ [EMBEDDED] CustomTicketService.updateTicket - Result:', {
      result,
      hasResult: !!result,
      resultKeys: result ? Object.keys(result) : [],
      centerstone: result?.centerstone,
      quoteTotal: result?.quoteTotal
    });

    return result;
  }

  /**
   * Delete ticket
   */
  static async deleteTicket(ticketId) {
    return await TicketCRUDService.deleteTicket(ticketId);
  }

  // ===== CUSTOMER OPERATIONS =====

  /**
   * Get user by ID
   */
  static async getUserById(userID) {
    return await CustomerService.getUserById(userID);
  }

  /**
   * Enrich ticket with customer data
   */
  static async enrichTicketWithCustomer(ticket) {
    return await CustomerService.enrichTicketWithCustomer(ticket);
  }

  /**
   * Enrich multiple tickets with customer data
   */
  static async enrichTicketsWithCustomers(tickets) {
    return await CustomerService.enrichTicketsWithCustomers(tickets);
  }

  // ===== STATUS OPERATIONS =====

  /**
   * Update ticket status with tracking
   */
  static async updateTicketStatus(ticketId, newStatus, reason = '') {
    return await TicketStatusService.updateTicketStatus(ticketId, newStatus, reason);
  }

  /**
   * Get ticket status history
   */
  static async getTicketStatusHistory(ticketId) {
    return await TicketStatusService.getTicketStatusHistory(ticketId);
  }

  /**
   * Get status statistics
   */
  static async getStatusStatistics() {
    return await TicketStatusService.getStatusStatistics();
  }

  // ===== ANALYTICS OPERATIONS =====

  /**
   * Get comprehensive tickets summary
   */
  static async getTicketsSummary() {
    return await TicketAnalyticsService.getTicketsSummary();
  }

  /**
   * Get revenue analytics
   */
  static async getRevenueAnalytics(timeframe = '30d') {
    return await TicketAnalyticsService.getRevenueAnalytics(timeframe);
  }

  /**
   * Get performance metrics
   */
  static async getPerformanceMetrics() {
    return await TicketAnalyticsService.getPerformanceMetrics();
  }
}

export default CustomTicketService;
