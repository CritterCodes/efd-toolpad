/**
 * Custom Ticket Detail API Route - Constitutional MVC Architecture
 * Route Layer: Delegates to Controller
 */

import CustomTicketController from '../controller.js';

export async function GET(request, { params }) {
  const { ticketId } = await params;
  return await CustomTicketController.getTicketById(request, ticketId);
}

export async function PUT(request, { params }) {
  const { ticketId } = await params;
  return await CustomTicketController.updateTicket(request, ticketId);
}

export async function PATCH(request, { params }) {
  const { ticketId } = await params;
  return await CustomTicketController.updateTicketStatus(request, ticketId);
}

export async function DELETE(request, { params }) {
  const { ticketId } = await params;
  return await CustomTicketController.deleteTicket(request, ticketId);
}
