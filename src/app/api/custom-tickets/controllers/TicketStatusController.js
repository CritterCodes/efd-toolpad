/**
 * Ticket Status Controller - Status Management Operations  
 * Constitutional Architecture: Controller Layer
 * Responsibility: HTTP request/response for status operations
 */

import CustomTicketService from '../service.js';

export default class TicketStatusController {
  /**
   * PUT /api/custom-tickets/[ticketId]/status - Update ticket status
   */
  static async updateTicketStatus(request, ticketId) {
    try {
      const { status: newStatus, reason } = await request.json();

      if (!newStatus) {
        return Response.json({
          success: false,
          error: 'Status is required'
        }, { status: 400 });
      }

      const result = await CustomTicketService.updateTicketStatus(ticketId, newStatus, reason);

      return Response.json({
        success: true,
        ticket: result.ticket,
        message: 'Ticket status updated successfully'
      });
    } catch (error) {
      console.error('Error in updateTicketStatus controller:', error);
      return Response.json({
        success: false,
        error: error.message || 'Failed to update ticket status',
        ticket: null
      }, { status: error.message === 'Ticket not found' ? 404 : 500 });
    }
  }

  /**
   * GET /api/custom-tickets/[ticketId]/status/history - Get status history
   */
  static async getTicketStatusHistory(request, ticketId) {
    try {
      const history = await CustomTicketService.getTicketStatusHistory(ticketId);

      return Response.json({
        success: true,
        history
      });
    } catch (error) {
      console.error('Error in getTicketStatusHistory controller:', error);
      return Response.json({
        success: false,
        error: error.message || 'Failed to fetch status history'
      }, { status: error.message === 'Ticket not found' ? 404 : 500 });
    }
  }

  /**
   * GET /api/custom-tickets/status/statistics - Get status statistics
   */
  static async getStatusStatistics(request) {
    try {
      const stats = await CustomTicketService.getStatusStatistics();

      return Response.json({
        success: true,
        statistics: stats
      });
    } catch (error) {
      console.error('Error in getStatusStatistics controller:', error);
      return Response.json({
        success: false,
        error: 'Failed to fetch status statistics'
      }, { status: 500 });
    }
  }
}