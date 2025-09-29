/**
 * Custom Tickets Controller - Backend Request/Response Handling
 * Constitutional Architecture: Controller Layer
 * Responsibility: HTTP request validation, response formatting ONLY
 */

import CustomTicketService from './service.js';

export default class CustomTicketController {
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
      console.error('CustomTicketController.getAllTickets error:', error);
      return Response.json({
        success: false,
        error: error.message || 'Failed to fetch tickets',
        tickets: [],
        totalCount: 0
      }, { status: 500 });
    }
  }

  /**
   * GET /api/custom-tickets/:id - Get single ticket by ID
   */
  static async getTicketById(request, ticketId) {
    try {
      if (!ticketId) {
        return Response.json({
          success: false,
          error: 'Ticket ID is required'
        }, { status: 400 });
      }

      const result = await CustomTicketService.getTicketById(ticketId);
      
      return Response.json({
        success: true,
        ticket: result.ticket
      });

    } catch (error) {
      console.error('CustomTicketController.getTicketById error:', error);
      
      const statusCode = error.message === 'Ticket not found' ? 404 : 500;
      return Response.json({
        success: false,
        error: error.message || 'Failed to fetch ticket',
        ticket: null
      }, { status: statusCode });
    }
  }

  /**
   * POST /api/custom-tickets - Create new ticket
   */
  static async createTicket(request) {
    try {
      const ticketData = await request.json();

      if (!ticketData) {
        return Response.json({
          success: false,
          error: 'Ticket data is required'
        }, { status: 400 });
      }

      const result = await CustomTicketService.createTicket(ticketData);
      
      return Response.json({
        success: true,
        ticket: result.ticket
      }, { status: 201 });

    } catch (error) {
      console.error('CustomTicketController.createTicket error:', error);
      return Response.json({
        success: false,
        error: error.message || 'Failed to create ticket',
        ticket: null
      }, { status: 500 });
    }
  }

  /**
   * PUT /api/custom-tickets/:id - Update ticket
   */
  static async updateTicket(request, ticketId) {
    try {
      if (!ticketId) {
        return Response.json({
          success: false,
          error: 'Ticket ID is required'
        }, { status: 400 });
      }

      const updateData = await request.json();

      if (!updateData) {
        return Response.json({
          success: false,
          error: 'Update data is required'
        }, { status: 400 });
      }

      const result = await CustomTicketService.updateTicket(ticketId, updateData);
      
      return Response.json({
        success: true,
        ticket: result.ticket
      });

    } catch (error) {
      console.error('CustomTicketController.updateTicket error:', error);
      
      const statusCode = error.message === 'Ticket not found' ? 404 : 500;
      return Response.json({
        success: false,
        error: error.message || 'Failed to update ticket',
        ticket: null
      }, { status: statusCode });
    }
  }

  /**
   * PATCH /api/custom-tickets/:id - Update ticket status
   */
  static async updateTicketStatus(request, ticketId) {
    try {
      if (!ticketId) {
        return Response.json({
          success: false,
          error: 'Ticket ID is required'
        }, { status: 400 });
      }

      const { status, metadata } = await request.json();

      if (!status) {
        return Response.json({
          success: false,
          error: 'Status is required'
        }, { status: 400 });
      }

      const result = await CustomTicketService.updateTicketStatus(ticketId, status, metadata || {});
      
      return Response.json({
        success: true,
        ticket: result.ticket
      });

    } catch (error) {
      console.error('CustomTicketController.updateTicketStatus error:', error);
      
      const statusCode = error.message === 'Ticket not found' ? 404 : 500;
      return Response.json({
        success: false,
        error: error.message || 'Failed to update status',
        ticket: null
      }, { status: statusCode });
    }
  }

  /**
   * DELETE /api/custom-tickets/:id - Delete ticket
   */
  static async deleteTicket(request, ticketId) {
    try {
      if (!ticketId) {
        return Response.json({
          success: false,
          error: 'Ticket ID is required'
        }, { status: 400 });
      }

      await CustomTicketService.deleteTicket(ticketId);
      
      return Response.json({
        success: true
      });

    } catch (error) {
      console.error('CustomTicketController.deleteTicket error:', error);
      
      const statusCode = error.message === 'Ticket not found' ? 404 : 500;
      return Response.json({
        success: false,
        error: error.message || 'Failed to delete ticket'
      }, { status: statusCode });
    }
  }

  /**
   * GET /api/custom-tickets/summary - Get tickets summary
   */
  static async getTicketsSummary(request) {
    try {
      const summary = await CustomTicketService.getTicketsSummary();
      
      return Response.json({
        success: true,
        summary
      });

    } catch (error) {
      console.error('CustomTicketController.getTicketsSummary error:', error);
      return Response.json({
        success: false,
        error: error.message || 'Failed to fetch summary',
        summary: {}
      }, { status: 500 });
    }
  }

  /**
   * Create deposit order for ticket
   * @param {string} ticketId - The ticket ID
   * @param {Object} orderData - The order data
   * @returns {Response} JSON response
   */
  static async createDepositOrder(ticketId, orderData) {
    try {
      // Validate required parameters
      if (!ticketId) {
        return Response.json({
          success: false,
          error: 'Ticket ID is required'
        }, { status: 400 });
      }

      const result = await CustomTicketService.createDepositOrder(ticketId, orderData);
      
      return Response.json({
        success: true,
        order: result.order,
        ticket: result.ticket
      });

    } catch (error) {
      console.error('CustomTicketController.createDepositOrder error:', error);
      
      const statusCode = error.message === 'Ticket not found' ? 404 : 500;
      return Response.json({
        success: false,
        error: error.message || 'Failed to create deposit order'
      }, { status: statusCode });
    }
  }

  /**
   * Create final order for ticket
   * @param {string} ticketId - The ticket ID
   * @param {Object} orderData - The order data
   * @returns {Response} JSON response
   */
  static async createFinalOrder(ticketId, orderData) {
    try {
      // Validate required parameters
      if (!ticketId) {
        return Response.json({
          success: false,
          error: 'Ticket ID is required'
        }, { status: 400 });
      }

      const result = await CustomTicketService.createFinalOrder(ticketId, orderData);
      
      return Response.json({
        success: true,
        order: result.order,
        ticket: result.ticket
      });

    } catch (error) {
      console.error('CustomTicketController.createFinalOrder error:', error);
      
      const statusCode = error.message === 'Ticket not found' ? 404 : 500;
      return Response.json({
        success: false,
        error: error.message || 'Failed to create final order'
      }, { status: statusCode });
    }
  }

  /**
   * Link Shopify order to ticket
   * @param {string} ticketId - The ticket ID
   * @param {string} orderType - The order type (deposit/final)
   * @param {string} orderId - The Shopify order ID
   * @returns {Response} JSON response
   */
  static async linkShopifyOrder(ticketId, orderType, orderId) {
    try {
      // Validate required parameters
      if (!ticketId) {
        return Response.json({
          success: false,
          error: 'Ticket ID is required'
        }, { status: 400 });
      }

      if (!orderType || !['deposit', 'final'].includes(orderType)) {
        return Response.json({
          success: false,
          error: 'Valid order type (deposit/final) is required'
        }, { status: 400 });
      }

      if (!orderId) {
        return Response.json({
          success: false,
          error: 'Order ID is required'
        }, { status: 400 });
      }

      const result = await CustomTicketService.linkShopifyOrder(ticketId, orderType, orderId);
      
      return Response.json({
        success: true,
        ticket: result
      });

    } catch (error) {
      console.error('CustomTicketController.linkShopifyOrder error:', error);
      
      const statusCode = error.message === 'Ticket not found' ? 404 : 500;
      return Response.json({
        success: false,
        error: error.message || 'Failed to link Shopify order'
      }, { status: statusCode });
    }
  }
}