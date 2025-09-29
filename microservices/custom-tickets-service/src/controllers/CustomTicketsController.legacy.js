/**
 * Custom Tickets Controller - MVC Architecture
 * Independent microservice HTTP controller
 */

import { CustomTicketService } from '../services/CustomTicketService.js';
import { CustomTicketModel } from '../models/CustomTicketModel.js';
import { logger } from '../utils/logger.js';

export class CustomTicketsController {
  /**
   * GET /api/tickets - Get all tickets with filters
   */
  static async getAllTickets(req, res) {
    try {
      const filters = {
        type: req.query.type,
        status: req.query.status,
        priority: req.query.priority,
        paymentReceived: req.query.paymentReceived === 'true',
        needsAttention: req.query.needsAttention === 'true',
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc'
      };

      // Remove undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === undefined || filters[key] === null || filters[key] === '') {
          delete filters[key];
        }
      });

      const result = await CustomTicketService.getAllTickets(filters);
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error,
          tickets: [],
          totalCount: 0
        });
      }

      // Apply business rules to each ticket
      const processedTickets = result.tickets.map(ticket => 
        CustomTicketModel.applyBusinessRules(ticket)
      );

      res.json({
        success: true,
        tickets: processedTickets.map(CustomTicketModel.serialize),
        totalCount: result.totalCount,
        pagination: {
          currentPage: filters.page,
          totalPages: Math.ceil(result.totalCount / filters.limit),
          hasNextPage: filters.page < Math.ceil(result.totalCount / filters.limit),
          hasPreviousPage: filters.page > 1
        }
      });

    } catch (error) {
      logger.error('Error in getAllTickets controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        tickets: [],
        totalCount: 0
      });
    }
  }

  /**
   * GET /api/tickets/:id - Get single ticket by ID
   */
  static async getTicketById(req, res) {
    try {
      const ticketId = req.params.id;
      const result = await CustomTicketService.getTicketById(ticketId);

      if (!result.success) {
        const statusCode = result.error === 'Ticket not found' ? 404 : 500;
        return res.status(statusCode).json({
          success: false,
          error: result.error,
          ticket: null
        });
      }

      // Apply business rules and serialize
      const processedTicket = CustomTicketModel.applyBusinessRules(result.ticket);
      
      res.json({
        success: true,
        ticket: CustomTicketModel.serialize(processedTicket)
      });

    } catch (error) {
      logger.error('Error in getTicketById controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        ticket: null
      });
    }
  }

  /**
   * POST /api/tickets - Create new ticket
   */
  static async createTicket(req, res) {
    try {
      const ticketData = req.body;
      
      // Validate ticket data
      const validation = CustomTicketModel.validateTicket(ticketData);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validation.errors,
          ticket: null
        });
      }

      // Create ticket model
      const ticket = CustomTicketModel.createTicket(ticketData);
      
      // Save through service
      const result = await CustomTicketService.createTicket(ticket);
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error,
          ticket: null
        });
      }

      // Apply business rules and serialize
      const processedTicket = CustomTicketModel.applyBusinessRules(result.ticket);
      
      logger.info(`Ticket created: ${processedTicket.ticketID}`);
      
      res.status(201).json({
        success: true,
        ticket: CustomTicketModel.serialize(processedTicket)
      });

    } catch (error) {
      logger.error('Error in createTicket controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        ticket: null
      });
    }
  }

  /**
   * PUT /api/tickets/:id - Update ticket
   */
  static async updateTicket(req, res) {
    try {
      const ticketId = req.params.id;
      const updateData = req.body;

      const result = await CustomTicketService.updateTicket(ticketId, updateData);
      
      if (!result.success) {
        const statusCode = result.error === 'Ticket not found' ? 404 : 500;
        return res.status(statusCode).json({
          success: false,
          error: result.error,
          ticket: null
        });
      }

      // Apply business rules and serialize
      const processedTicket = CustomTicketModel.applyBusinessRules(result.ticket);
      
      logger.info(`Ticket updated: ${ticketId}`);
      
      res.json({
        success: true,
        ticket: CustomTicketModel.serialize(processedTicket)
      });

    } catch (error) {
      logger.error('Error in updateTicket controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        ticket: null
      });
    }
  }

  /**
   * PATCH /api/tickets/:id/status - Update ticket status
   */
  static async updateTicketStatus(req, res) {
    try {
      const ticketId = req.params.id;
      const { status, reason } = req.body;

      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Status is required',
          ticket: null
        });
      }

      const result = await CustomTicketService.updateTicketStatus(ticketId, status, reason);
      
      if (!result.success) {
        const statusCode = result.error === 'Ticket not found' ? 404 : 500;
        return res.status(statusCode).json({
          success: false,
          error: result.error,
          ticket: null
        });
      }

      // Apply business rules and serialize
      const processedTicket = CustomTicketModel.applyBusinessRules(result.ticket);
      
      logger.info(`Ticket status updated: ${ticketId} -> ${status}`);
      
      res.json({
        success: true,
        ticket: CustomTicketModel.serialize(processedTicket)
      });

    } catch (error) {
      logger.error('Error in updateTicketStatus controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        ticket: null
      });
    }
  }

  /**
   * DELETE /api/tickets/:id - Delete ticket
   */
  static async deleteTicket(req, res) {
    try {
      const ticketId = req.params.id;
      const result = await CustomTicketService.deleteTicket(ticketId);
      
      if (!result.success) {
        const statusCode = result.error === 'Ticket not found' ? 404 : 500;
        return res.status(statusCode).json({
          success: false,
          error: result.error
        });
      }

      logger.info(`Ticket deleted: ${ticketId}`);
      
      res.json({
        success: true,
        message: 'Ticket deleted successfully'
      });

    } catch (error) {
      logger.error('Error in deleteTicket controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * GET /api/tickets/stats/summary - Get tickets summary statistics
   */
  static async getTicketsSummary(req, res) {
    try {
      const result = await CustomTicketService.getTicketsSummary();
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error,
          summary: null
        });
      }

      res.json({
        success: true,
        summary: result.summary
      });

    } catch (error) {
      logger.error('Error in getTicketsSummary controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        summary: null
      });
    }
  }
}

export default CustomTicketsController;