/**
 * Ticket Query Controller
 * Constitutional Architecture: Controller Layer
 * Responsibility: HTTP request/response for querying custom tickets
 */

import CustomTicketService from '../service.js';
import { auth } from '../../../../../auth.js';

export default class TicketQueryController {
  /**
   * GET /api/custom-tickets - Get all tickets with filters
   */
  static async getAllTickets(request) {
    try {
      const { searchParams } = new URL(request.url);
      
      // Get user session to apply role-based filtering
      const session = await auth();
      
      const filters = {
        type: searchParams.get('type'),
        status: searchParams.get('status'),
        priority: searchParams.get('priority'),
        paymentReceived: searchParams.get('paymentReceived') === 'true',
        cardPaymentStatus: searchParams.get('cardPaymentStatus'),
        assignedArtisan: searchParams.get('assignedArtisan'), // Filter by assigned artisan
        dateFrom: searchParams.get('dateFrom'),
        dateTo: searchParams.get('dateTo'),
        page: parseInt(searchParams.get('page')) || 1,
        limit: parseInt(searchParams.get('limit')) || 50,
        sortBy: searchParams.get('sortBy') || 'createdAt',
        sortOrder: searchParams.get('sortOrder') || 'desc'
      };

      // Auto-filter for artisan users: they should only see tickets assigned to them
      // Admins and staff see all tickets
      if (session?.user?.role === 'artisan' && session?.user?.id) {
        filters.assignedArtisan = session.user.id;
        console.log('👨‍🎨 Artisan user detected - filtering tickets assigned to:', session.user.id);
      } else if (session?.user?.role === 'admin' || session?.user?.role === 'staff') {
        // Admins and staff see all tickets - no additional filtering applied
        console.log('👤 Admin/Staff user detected - showing all tickets');
      }

      // Remove null/undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === null || filters[key] === undefined || filters[key] === '') {
          delete filters[key];
        }
      });

      const result = await CustomTicketService.getAllTickets(filters);
      
      return Response.json({
        success: true,
        tickets: result.tickets || [],
        totalCount: result.totalCount || 0,
        pagination: result.pagination || {
          currentPage: filters.page,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        }
      });
    } catch (error) {
      console.error('Error in getAllTickets controller:', error);
      return Response.json({
        success: false,
        error: 'Failed to fetch tickets',
        tickets: [],
        totalCount: 0,
        pagination: { currentPage: 1, totalPages: 0, hasNextPage: false, hasPreviousPage: false }
      }, { status: 500 });
    }
  }

  /**
   * GET /api/custom-tickets/[ticketId] - Get specific ticket
   */
  static async getTicketById(request, ticketId) {
    try {
      const result = await CustomTicketService.getTicketById(ticketId);
      
      if (!result.ticket) {
        return Response.json({
          success: false,
          error: 'Ticket not found',
          ticket: null
        }, { status: 404 });
      }

      return Response.json({
        success: true,
        ticket: result.ticket
      });
    } catch (error) {
      console.error('Error in getTicketById controller:', error);
      return Response.json({
        success: false,
        error: 'Failed to fetch ticket',
        ticket: null
      }, { status: 500 });
    }
  }

  /**
   * GET /api/custom-tickets/artisan - Get tickets assigned to current artisan
   */
  static async getArtisanTickets(request) {
    try {
      console.log('🎯 [CONTROLLER] TicketCRUDController.getArtisanTickets - Starting');
      
      const { searchParams } = new URL(request.url);
      const artisanUserId = searchParams.get('artisanUserId');
      
      console.log('🔍 [CONTROLLER] Request params:', {
        artisanUserId,
        url: request.url,
        searchParams: Object.fromEntries(searchParams)
      });
      
      if (!artisanUserId) {
        console.error('❌ [CONTROLLER] Missing artisanUserId parameter');
        return Response.json({
          success: false,
          error: 'artisanUserId parameter is required'
        }, { status: 400 });
      }

      const filters = {
        assignedArtisan: artisanUserId,
        type: searchParams.get('type'),
        status: searchParams.get('status'),
        priority: searchParams.get('priority'),
        page: parseInt(searchParams.get('page')) || 1,
        limit: parseInt(searchParams.get('limit')) || 50,
        sortBy: searchParams.get('sortBy') || 'createdAt',
        sortOrder: searchParams.get('sortOrder') || 'desc'
      };

      // Remove null/undefined filters
      Object.keys(filters).forEach(key => {
        if (filters[key] === null || filters[key] === undefined || filters[key] === '') {
          delete filters[key];
        }
      });

      console.log('🔧 [CONTROLLER] Final filters:', filters);
      console.log('🔄 [CONTROLLER] Calling CustomTicketService.getArtisanTickets...');

      const result = await CustomTicketService.getArtisanTickets(filters);
      
      console.log('✅ [CONTROLLER] Service returned result:', {
        hasResult: !!result,
        ticketCount: result?.tickets?.length || 0,
        totalCount: result?.totalCount || 0
      });
      
      const response = {
        success: true,
        tickets: result.tickets || [],
        totalCount: result.totalCount || 0,
        pagination: result.pagination || {
          currentPage: filters.page || 1,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false
        }
      };
      
      console.log('📤 [CONTROLLER] Returning response:', {
        success: response.success,
        ticketCount: response.tickets.length,
        totalCount: response.totalCount
      });
      
      return Response.json(response);
    } catch (error) {
      console.error('❌ [CONTROLLER] Error in getArtisanTickets:', error);
      return Response.json({
        success: false,
        error: 'Failed to fetch artisan tickets',
        tickets: [],
        totalCount: 0,
        pagination: { currentPage: 1, totalPages: 0, hasNextPage: false, hasPreviousPage: false }
      }, { status: 500 });
    }
  }
}
