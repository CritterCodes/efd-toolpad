/**
 * Ticket Update Controller
 * Constitutional Architecture: Controller Layer
 * Responsibility: HTTP request/response for updating custom tickets
 */

import CustomTicketService from '../service.js';

export default class TicketUpdateController {
  /**
   * PUT /api/custom-tickets/[ticketId] - Update ticket
   */
  static async updateTicket(request, ticketId) {
    try {
      const updateData = await request.json();
      const ticket = await CustomTicketService.updateTicket(ticketId, updateData);

      return Response.json({
        success: true,
        ticket,
        message: 'Ticket updated successfully'
      });
    } catch (error) {
      console.error('Error in updateTicket controller:', error);
      return Response.json({
        success: false,
        error: error.message || 'Failed to update ticket',
        ticket: null
      }, { status: error.message === 'Ticket not found' ? 404 : 500 });
    }
  }

  /**
   * POST /api/custom-tickets/[ticketId]/assign-artisan - Assign artisan to ticket
   */
  static async assignArtisanToTicket(request, ticketId) {
    try {
      const { userId, artisanType, userName } = await request.json();
      
      if (!userId || !artisanType) {
        return Response.json({
          success: false,
          error: 'userId and artisanType are required'
        }, { status: 400 });
      }

      // Fetch full artisan data to get business name, real name, and slug
      const db = require('@/lib/database.js').db;
      const usersCollection = await db.dbUsers();
      const artisan = await usersCollection.findOne({ userID: userId });
      
      const assignmentData = {
        userId,
        artisanType,
        userName: userName || 'Unknown Artisan',
        artisanBusinessName: artisan?.artisanApplication?.businessName || userName || 'Unknown Artisan',
        artisanFirstName: artisan?.firstName || artisan?.artisanApplication?.firstName || '',
        artisanLastName: artisan?.lastName || artisan?.artisanApplication?.lastName || '',
        artisanSlug: artisan?.artisanApplication?.slug || '',
        assignedAt: new Date().toISOString()
      };

      const result = await CustomTicketService.assignArtisanToTicket(ticketId, assignmentData);
      
      return Response.json({
        success: true,
        ticket: result.ticket,
        message: 'Artisan assigned successfully'
      });
    } catch (error) {
      console.error('Error in assignArtisanToTicket controller:', error);
      return Response.json({
        success: false,
        error: error.message || 'Failed to assign artisan'
      }, { status: 500 });
    }
  }

  /**
   * DELETE /api/custom-tickets/[ticketId]/remove-artisan - Remove artisan from ticket
   */
  static async removeArtisanFromTicket(request, ticketId) {
    try {
      const { userId } = await request.json();
      
      if (!userId) {
        return Response.json({
          success: false,
          error: 'userId is required'
        }, { status: 400 });
      }

      const result = await CustomTicketService.removeArtisanFromTicket(ticketId, userId);
      
      return Response.json({
        success: true,
        ticket: result.ticket,
        message: 'Artisan removed successfully'
      });
    } catch (error) {
      console.error('Error in removeArtisanFromTicket controller:', error);
      return Response.json({
        success: false,
        error: error.message || 'Failed to remove artisan'
      }, { status: 500 });
    }
  }
}
