/**
 * Custom Tickets Microservice Controller - Express HTTP Handler
 * Constitutional Architecture: Microservice Controller Layer
 * Responsibility: HTTP request/response handling for microservice endpoints
 */

import CustomTicketService from '../services/CustomTicketService.js';

export class CustomTicketsController {
  /**
   * GET /tickets - Get all tickets
   */
  static async getAllTickets(req, res) {
    try {
      const filters = req.query;
      const result = await CustomTicketService.getAllTickets(filters);
      
      res.status(200).json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error in getAllTickets:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch tickets',
        tickets: [],
        totalCount: 0
      });
    }
  }

  /**
   * GET /tickets/:id - Get ticket by ID
   */
  static async getTicketById(req, res) {
    try {
      const { id } = req.params;
      const ticket = await CustomTicketService.getTicketById(id);
      
      if (!ticket) {
        return res.status(404).json({
          success: false,
          error: 'Ticket not found',
          ticket: null
        });
      }

      res.status(200).json({
        success: true,
        ticket
      });
    } catch (error) {
      console.error('Error in getTicketById:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch ticket',
        ticket: null
      });
    }
  }

  /**
   * POST /tickets - Create new ticket
   */
  static async createTicket(req, res) {
    try {
      const ticketData = req.body;
      const ticket = await CustomTicketService.createTicket(ticketData);

      res.status(201).json({
        success: true,
        ticket,
        message: 'Ticket created successfully'
      });
    } catch (error) {
      console.error('Error in createTicket:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to create ticket',
        ticket: null
      });
    }
  }

  /**
   * PUT /tickets/:id - Update ticket
   */
  static async updateTicket(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const ticket = await CustomTicketService.updateTicket(id, updateData);

      res.status(200).json({
        success: true,
        ticket,
        message: 'Ticket updated successfully'
      });
    } catch (error) {
      console.error('Error in updateTicket:', error);
      const statusCode = error.message === 'Ticket not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to update ticket',
        ticket: null
      });
    }
  }

  /**
   * PUT /tickets/:id/status - Update ticket status
   */
  static async updateTicketStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, reason } = req.body;
      
      if (!status) {
        return res.status(400).json({
          success: false,
          error: 'Status is required'
        });
      }

      const ticket = await CustomTicketService.updateTicketStatus(id, status, reason);

      res.status(200).json({
        success: true,
        ticket,
        message: 'Ticket status updated successfully'
      });
    } catch (error) {
      console.error('Error in updateTicketStatus:', error);
      const statusCode = error.message === 'Ticket not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to update ticket status',
        ticket: null
      });
    }
  }

  /**
   * DELETE /tickets/:id - Delete ticket
   */
  static async deleteTicket(req, res) {
    try {
      const { id } = req.params;
      const result = await CustomTicketService.deleteTicket(id);

      res.status(200).json({
        success: true,
        message: 'Ticket deleted successfully',
        ticketId: result.ticketId
      });
    } catch (error) {
      console.error('Error in deleteTicket:', error);
      const statusCode = error.message === 'Ticket not found' ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Failed to delete ticket'
      });
    }
  }

  /**
   * GET /tickets/summary - Get tickets summary
   */
  static async getTicketsSummary(req, res) {
    try {
      const summary = await CustomTicketService.getTicketsSummary();

      res.status(200).json({
        success: true,
        summary
      });
    } catch (error) {
      console.error('Error in getTicketsSummary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate tickets summary'
      });
    }
  }
}

export default CustomTicketsController;