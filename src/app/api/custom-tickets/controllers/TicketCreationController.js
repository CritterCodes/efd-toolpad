/**
 * Ticket Creation Controller
 * Constitutional Architecture: Controller Layer
 * Responsibility: HTTP request/response for creating custom tickets
 */

import CustomTicketService from '../service.js';

export default class TicketCreationController {
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
}
