/**
 * Custom Tickets Main Controller - Request Orchestration
 * Constitutional Architecture: Controller Layer  
 * Responsibility: Route requests to appropriate specialized controllers
 */

import TicketCRUDController from './controllers/TicketCRUDController.js';
import TicketStatusController from './controllers/TicketStatusController.js';
import ShopifyController from './controllers/ShopifyController.js';
import AnalyticsController from './controllers/AnalyticsController.js';

export default class CustomTicketController {
  // ===== CRUD OPERATIONS =====
  
  static async getAllTickets(request) {
    return await TicketCRUDController.getAllTickets(request);
  }

  static async getTicketById(request, ticketId) {
    return await TicketCRUDController.getTicketById(request, ticketId);
  }

  static async createTicket(request) {
    return await TicketCRUDController.createTicket(request);
  }

  static async updateTicket(request, ticketId) {
    return await TicketCRUDController.updateTicket(request, ticketId);
  }

  static async deleteTicket(request, ticketId) {
    return await TicketCRUDController.deleteTicket(request, ticketId);
  }

  // ===== STATUS OPERATIONS =====

  static async updateTicketStatus(request, ticketId) {
    return await TicketStatusController.updateTicketStatus(request, ticketId);
  }

  static async getTicketStatusHistory(request, ticketId) {
    return await TicketStatusController.getTicketStatusHistory(request, ticketId);
  }

  static async getStatusStatistics(request) {
    return await TicketStatusController.getStatusStatistics(request);
  }

  // ===== SHOPIFY OPERATIONS =====

  static async createDepositOrder(ticketId, orderData) {
    return await ShopifyController.createDepositOrder(ticketId, orderData);
  }

  static async createFinalOrder(ticketId, orderData) {
    return await ShopifyController.createFinalOrder(ticketId, orderData);
  }

  static async linkShopifyOrder(ticketId, orderType, orderId) {
    return await ShopifyController.linkShopifyOrder(ticketId, orderType, orderId);
  }

  // ===== ANALYTICS OPERATIONS =====

  static async getTicketsSummary(request) {
    return await AnalyticsController.getTicketsSummary(request);
  }

  static async getRevenueAnalytics(request) {
    return await AnalyticsController.getRevenueAnalytics(request);
  }

  static async getPerformanceMetrics(request) {
    return await AnalyticsController.getPerformanceMetrics(request);
  }

  // ===== ARTISAN ASSIGNMENT OPERATIONS =====

  static async assignArtisanToTicket(request, ticketId) {
    return await TicketCRUDController.assignArtisanToTicket(request, ticketId);
  }

  static async removeArtisanFromTicket(request, ticketId) {
    return await TicketCRUDController.removeArtisanFromTicket(request, ticketId);
  }

  static async getArtisanTickets(request) {
    return await TicketCRUDController.getArtisanTickets(request);
  }
}