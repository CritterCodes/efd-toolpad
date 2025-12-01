/**
 * Custom Ticket Remove Artisan API Route
 * Handles removing artisan assignment from tickets
 */

import CustomTicketController from '../../controller.js';

export async function DELETE(request, { params }) {
  const { ticketId } = params;
  return await CustomTicketController.removeArtisanFromTicket(request, ticketId);
}