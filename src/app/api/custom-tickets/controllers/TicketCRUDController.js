/**
 * Ticket CRUD Controller - Core Ticket Operations
 * Constitutional Architecture: Controller Layer
 * Responsibility: HTTP request/response for CRUD operations
 */

import CustomTicketService from '../service.js';

export default class TicketCRUDController {
  /**
   * GET /api/custom-tickets - Get all tickets with filters
   */
  static async getAllTickets(request) {
    try {
      const { searchParams } = new URL(request.url);
      
      const filters = {
        type: searchParams.get('type'),
        status: searchParams.get('status'),
        priority: searchParams.get('priority'),
        paymentReceived: searchParams.get('paymentReceived') === 'true',
        cardPaymentStatus: searchParams.get('cardPaymentStatus'),
        hasShopifyOrders: searchParams.get('hasShopifyOrders') === 'true',
        dateFrom: searchParams.get('dateFrom'),
        dateTo: searchParams.get('dateTo'),
        page: parseInt(searchParams.get('page')) || 1,
        limit: parseInt(searchParams.get('limit')) || 50,
        sortBy: searchParams.get('sortBy') || 'createdAt',
        sortOrder: searchParams.get('sortOrder') || 'desc'
      };

      // Remove null/undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === null || filters[key] === undefined || filters[key] === '') {
          delete filters[key];
        }
      });

      const result = await CustomTicketService.getAllTickets(filters);
      
      return Response.json({
        success: true,
        tickets: result.tickets || [],
        totalCount: result.totalCount || 0,
        pagination: result.pagination || {
          currentPage: filters.page,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        }
      });
    } catch (error) {
      console.error('Error in getAllTickets controller:', error);
      return Response.json({
        success: false,
        error: 'Failed to fetch tickets',
        tickets: [],
        totalCount: 0,
        pagination: { currentPage: 1, totalPages: 0, hasNextPage: false, hasPreviousPage: false }
      }, { status: 500 });
    }
  }

  /**
   * GET /api/custom-tickets/[ticketId] - Get specific ticket
   */
  static async getTicketById(request, ticketId) {
    try {
      const result = await CustomTicketService.getTicketById(ticketId);
      
      if (!result.ticket) {
        return Response.json({
          success: false,
          error: 'Ticket not found',
          ticket: null
        }, { status: 404 });
      }

      return Response.json({
        success: true,
        ticket: result.ticket
      });
    } catch (error) {
      console.error('Error in getTicketById controller:', error);
      return Response.json({
        success: false,
        error: 'Failed to fetch ticket',
        ticket: null
      }, { status: 500 });
    }
  }

  /**
   * POST /api/custom-tickets - Create new ticket
   */
  static async createTicket(request) {
    try {
      const ticketData = await request.json();
      const ticket = await CustomTicketService.createTicket(ticketData);

      return Response.json({
        success: true,
        ticket,
        message: 'Ticket created successfully'
      }, { status: 201 });
    } catch (error) {
      console.error('Error in createTicket controller:', error);
      return Response.json({
        success: false,
        error: 'Failed to create ticket',
        ticket: null
      }, { status: 500 });
    }
  }

  /**
   * PUT /api/custom-tickets/[ticketId] - Update ticket
   */
  static async updateTicket(request, ticketId) {
    try {
      const updateData = await request.json();
      const ticket = await CustomTicketService.updateTicket(ticketId, updateData);

      return Response.json({
        success: true,
        ticket,
        message: 'Ticket updated successfully'
      });
    } catch (error) {
      console.error('Error in updateTicket controller:', error);
      return Response.json({
        success: false,
        error: error.message || 'Failed to update ticket',
        ticket: null
      }, { status: error.message === 'Ticket not found' ? 404 : 500 });
    }
  }

  /**
   * DELETE /api/custom-tickets/[ticketId] - Delete ticket
   */
  static async deleteTicket(request, ticketId) {
    try {
      const result = await CustomTicketService.deleteTicket(ticketId);

      return Response.json({
        success: true,
        message: 'Ticket deleted successfully',
        ticketId: result.ticketId
      });
    } catch (error) {
      console.error('Error in deleteTicket controller:', error);
      return Response.json({
        success: false,
        error: error.message || 'Failed to delete ticket'
      }, { status: error.message === 'Ticket not found' ? 404 : 500 });
    }
  }
}