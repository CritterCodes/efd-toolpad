/**
 * Custom Tickets Summary API Route - Constitutional MVC Architecture
 * Route Layer: Delegates to Controller
 */

import CustomTicketController from "../controller.js";

export async function GET(request) {
  return await CustomTicketController.getTicketsSummary();
}
