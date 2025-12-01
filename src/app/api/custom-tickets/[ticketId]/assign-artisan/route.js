/**
 * Custom Ticket Artisan Assignment API Route
 * Handles artisan assignment to tickets
 */

import CustomTicketController from '../../controller.js';

export async function POST(request, { params }) {
  const { ticketId } = await params;
  return await CustomTicketController.assignArtisanToTicket(request, ticketId);     
}