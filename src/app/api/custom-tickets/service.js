/**
 * Custom Tickets Service Facade - Backend Business Logic Orchestration
 * Constitutional Architecture: Service Layer
 * Responsibility: Facade that delegates business logic to specialized services
 */

import { CrudService } from './services/crud.service.js';
import { StatusService } from './services/status.service.js';
import { AssignmentsService } from './services/assignments.service.js';

export default class CustomTicketService {
  /**
   * Get all tickets with business logic applied
   */
  static async getAllTickets(filters = {}) {
    return await CrudService.getAllTickets(filters);
  }

  /**
   * Get single ticket by ID with business logic
   */
  static async getTicketById(ticketId) {
    return await CrudService.getTicketById(ticketId);
  }

  /**
   * Create new ticket with validation and business logic
   */
  static async createTicket(ticketData) {
    return await CrudService.createTicket(ticketData);
  }

  /**
   * Update an existing ticket
   */
  static async updateTicket(ticketId, updateData) {
    return await CrudService.updateTicket(ticketId, updateData);
  }

  /**
   * Delete a ticket
   */
  static async deleteTicket(ticketId) {
    return await CrudService.deleteTicket(ticketId);
  }

  /**
   * Get summary statistics for custom tickets
   */
  static async getTicketsSummary() {
    return await CrudService.getTicketsSummary();
  }

  /**
   * Update a ticket's status
   */
  static async updateTicketStatus(ticketId, status, metadata = {}) {
    return await StatusService.updateTicketStatus(ticketId, status, metadata);
  }

  /**
   * Assign an artisan to a custom ticket
   */
  static async assignArtisanToTicket(ticketId, assignmentData) {
    return await AssignmentsService.assignArtisanToTicket(ticketId, assignmentData);
  }

  /**
   * Remove an artisan assignment and unlock ticket
   */
  static async removeArtisanFromTicket(ticketId, artisanUserId) {
    return await AssignmentsService.removeArtisanFromTicket(ticketId, artisanUserId);
  }

  /**
   * Get tickets assigned to an artisan
   */
  static async getArtisanTickets(filters = {}) {
    return await AssignmentsService.getArtisanTickets(filters);
  }
}
