/**
 * Custom Tickets API Route - Constitutional MVC Architecture
 * Route Layer: Delegates to Controller
 */

import CustomTicketController from './controller.js';

export async function GET(request) {
  return await CustomTicketController.getAllTickets(request);
}

export async function POST(request) {
  return await CustomTicketController.createTicket(request);
}
