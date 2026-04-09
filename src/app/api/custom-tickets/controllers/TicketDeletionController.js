/**
 * Ticket Deletion Controller
 * Constitutional Architecture: Controller Layer
 * Responsibility: HTTP request/response for deleting custom tickets
 */

import CustomTicketService from '../service.js';

export default class TicketDeletionController {
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
