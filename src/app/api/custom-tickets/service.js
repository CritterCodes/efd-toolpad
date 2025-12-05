/**
 * Custom Tickets Service - Backend Business Logic Orchestration
 * Constitutional Architecture: Service Layer
 * Responsibility: Business logic coordination, microservice integration
 */

import { getCustomTicketsAdapter } from '@/api-clients/customTicketsMicroserviceAdapter.js';
import CustomTicketModel from './model.js';

// Default to embedded mode unless explicitly configured otherwise
const adapter = getCustomTicketsAdapter({
  mode: process.env.MICROSERVICE_MODE || 'embedded'
});

// Initialize adapter for embedded mode (async initialization handled in methods)
let adapterInitialized = false;
const ensureAdapterInitialized = async () => {
  if (!adapterInitialized) {
    await adapter.initializeEmbeddedService();
    adapterInitialized = true;
  }
};

export default class CustomTicketService {
  /**
   * Get all tickets with business logic applied
   */
  static async getAllTickets(filters = {}) {
    try {
      // Ensure adapter is initialized before use
      await ensureAdapterInitialized();
      
      // Use pre-initialized adapter - microservice returns direct result
      const result = await adapter.getAllTickets(filters);
      
      // Microservice returns direct object, not wrapped in success/error format
      return result;
    } catch (error) {
      console.error('CustomTicketService.getAllTickets error:', error);
      throw new Error(`Service error: ${error.message}`);
    }
  }

  /**
   * Get single ticket by ID with business logic
   */
  static async getTicketById(ticketId) {
    try {
      // Ensure adapter is initialized before use
      await ensureAdapterInitialized();

      // Validate ID format
      await CustomTicketModel.validateTicketId(ticketId);

      // Use pre-initialized adapter - microservice returns direct ticket or null
      const ticket = await adapter.getTicketById(ticketId);
      
      return {
        ticket: ticket
      };
    } catch (error) {
      console.error('CustomTicketService.getTicketById error:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Create new ticket with validation and business logic
   */
  static async createTicket(ticketData) {
    try {
      // Validate input data
      const validatedData = await CustomTicketModel.validateTicketData(ticketData);

      // Apply business rules before creation
      const processedData = await CustomTicketModel.applyCreationBusinessRules(validatedData);

      // Use microservice for creation
      const adapter = getCustomTicketsAdapter();
      const result = await adapter.createTicket(processedData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create ticket');
      }

      // Send confirmation notification to client
      try {
        const { NotificationService, NOTIFICATION_TYPES, CHANNELS } = await import('@/lib/notificationService.js');
        
        if (result.ticket?.userID) {
          // Fetch user to get their email
          try {
            const usersCollection = await db.dbUsers();
            const user = await usersCollection.findOne({ userID: result.ticket.userID });
            
            if (user && user.email) {
              console.log(`📧 Sending ticket creation notification to ${user.email}`);
              
              const adminBaseUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';
              const ticketUrl = `${adminBaseUrl}/dashboard/custom-tickets/${result.ticket.ticketID}`;
              
              await NotificationService.createNotification({
                userId: result.ticket.userID,
                type: NOTIFICATION_TYPES.CUSTOM_TICKET_CREATED,
                title: `Custom Ticket Created - #${result.ticket.ticketID || 'N/A'}`,
                message: `Your custom design ticket has been created and is now available to our artisan team.`,
                channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
                data: {
                  ticketNumber: result.ticket.ticketID || 'N/A',
                  description: result.ticket.description || 'Custom design work',
                  ticketUrl
                },
                templateName: 'custom_ticket_created',
                recipientEmail: user.email
              });
              
              console.log(`✅ Ticket creation notification sent to ${user.email}`);
            } else {
              console.warn(`⚠️ Could not send notification - user not found or has no email`);
            }
          } catch (userFetchError) {
            console.error('⚠️ Failed to fetch user for notification:', userFetchError);
          }
        }
      } catch (notificationError) {
        console.error('⚠️ Failed to send ticket creation notification:', notificationError);
        // Don't fail the API if notifications fail
      }

      return {
        ticket: result.ticket
      };
    } catch (error) {
      console.error('CustomTicketService.createFinalOrder error:', error);
      throw error;
    }
  }

  /**
   * Link a Shopify order to a ticket
   * @param {string} ticketId - Ticket ID
   * @param {string} orderType - Type of order (deposit/final)
   * @param {string} orderId - Shopify order ID
   * @returns {Promise<Object>} Updated ticket
   */
  static async linkShopifyOrder(ticketId, orderType, orderId) {
    try {
      const result = await adapter.linkShopifyOrder(ticketId, orderType, orderId);
      return result.ticket;
      
    } catch (error) {
      console.error('CustomTicketService.linkShopifyOrder error:', error);
      throw error;
    }
  }

  /**
   * Update ticket with validation and business logic
   */
  static async updateTicket(ticketId, updateData) {
    try {
      console.log('🔄 CustomTicketService.updateTicket - Starting:', {
        ticketId,
        updateData,
        dataKeys: Object.keys(updateData),
        centerstone: updateData.centerstone,
        hasAnalytics: !!updateData.analytics,
        quoteTotal: updateData.quoteTotal
      });

      // Validate ticket ID
      await CustomTicketModel.validateTicketId(ticketId);
      const validatedData = await CustomTicketModel.validateUpdateData(updateData);
      
      console.log('✅ CustomTicketService.updateTicket - Validation passed:', {
        validatedData,
        validatedDataKeys: Object.keys(validatedData || updateData)
      });

      // Apply business rules for updates
      const processedData = await CustomTicketModel.applyUpdateBusinessRules(validatedData);
      
      console.log('✅ CustomTicketService.updateTicket - Business rules applied:', {
        processedData,
        processedDataKeys: Object.keys(processedData || validatedData || updateData)
      });

      // Use microservice for update
      const adapter = getCustomTicketsAdapter();
      const result = await adapter.updateTicket(ticketId, processedData);
      
      console.log('✅ CustomTicketService.updateTicket - Microservice result:', {
        success: result.success,
        hasTicket: !!result.ticket,
        ticketKeys: result.ticket ? Object.keys(result.ticket) : [],
        error: result.error
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update ticket');
      }

      return {
        ticket: result.ticket
      };
    } catch (error) {
      console.error('❌ CustomTicketService.updateTicket error:', error);
      throw new Error(error.message);
    }
  }

/**
 * Update ticket status with workflow validation
 */
static async updateTicketStatus(ticketId, status, metadata = {}) {
  try {
    // Validate inputs
    await CustomTicketModel.validateTicketId(ticketId);
    await CustomTicketModel.validateStatusTransition(ticketId, status);

    // Use microservice for status update
    const adapter = getCustomTicketsAdapter();
    const updatedTicket = await adapter.updateTicketStatus(ticketId, status, metadata);
    
    // The microservice returns the ticket directly, not wrapped in success/error
    if (!updatedTicket) {
      throw new Error('Failed to update status - no ticket returned');
    }

    // Send notification to client about status change
    try {
      const { NotificationService, NOTIFICATION_TYPES, CHANNELS } = await import('@/lib/notificationService.js');
      
      const previousStatus = metadata.previousStatus || 'Unknown';
      const ticketNumber = updatedTicket.ticketID || ticketId.slice(-8);
      
      // Notify the client who created the ticket
      if (updatedTicket.userID) {
        const adminBaseUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';
        const ticketUrl = `${adminBaseUrl}/dashboard/custom-tickets/${updatedTicket.ticketID}`;
        
        await NotificationService.createNotification({
          userId: updatedTicket.userID,
          type: NOTIFICATION_TYPES.CUSTOM_TICKET_STATUS_CHANGED,
          title: `Ticket #${ticketNumber} Status Updated`,
          message: `Your custom ticket status changed from ${previousStatus} to ${status}`,
          channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
          data: {
            ticketNumber,
            previousStatus,
            newStatus: status,
            reason: metadata.reason || '',
            ticketUrl
          },
          templateName: 'custom_ticket_status_changed',
          recipientEmail: updatedTicket.clientEmail
        });
      }
    } catch (notificationError) {
      console.error('⚠️ Failed to send status change notification:', notificationError);
      // Don't fail the API if notifications fail
    }

    return {
      ticket: updatedTicket
    };
  } catch (error) {
    console.error('CustomTicketService.updateTicketStatus error:', error);
    throw new Error(error.message);
  }
}

  /**
   * Delete ticket with validation
   */
  static async deleteTicket(ticketId) {
    try {
      // Validate ID
      await CustomTicketModel.validateTicketId(ticketId);

      // Check if ticket can be deleted (business rules)
      await CustomTicketModel.validateDeletion(ticketId);

      // Use microservice for deletion
      const adapter = getCustomTicketsAdapter();
      const result = await adapter.deleteTicket(ticketId);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete ticket');
      }

      return { success: true };
    } catch (error) {
      console.error('CustomTicketService.deleteTicket error:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Get tickets summary statistics
   */
  static async getTicketsSummary() {
    try {
      // Ensure adapter is initialized before use
      await ensureAdapterInitialized();
      
      // Use pre-initialized adapter - microservice returns direct result
      const result = await adapter.getTicketsSummary();
      
      // Microservice returns direct summary object
      return result;
    } catch (error) {
      console.error('CustomTicketService.getTicketsSummary error:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Create Shopify deposit order
   */
  static async createDepositOrder(ticketId, orderData) {
    try {
      await CustomTicketModel.validateTicketId(ticketId);
      await CustomTicketModel.validateOrderData(orderData);

      const adapter = getCustomTicketsAdapter();
      const result = await adapter.createDepositOrder(ticketId, orderData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create deposit order');
      }

      return result;
    } catch (error) {
      console.error('CustomTicketService.createDepositOrder error:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Create Shopify final order
   */
  static async createFinalOrder(ticketId, orderData) {
    try {
      await CustomTicketModel.validateTicketId(ticketId);
      await CustomTicketModel.validateOrderData(orderData);

      const adapter = getCustomTicketsAdapter();
      const result = await adapter.createFinalOrder(ticketId, orderData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create final order');
      }

      return result;
    } catch (error) {
      console.error('CustomTicketService.createFinalOrder error:', error);
      throw new Error(error.message);
    }
  }

  /**
   * Helper method to calculate pagination
   */
  static calculatePagination(filters, totalCount) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const totalPages = Math.ceil(totalCount / limit);

    return {
      currentPage: page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      itemsPerPage: limit,
      totalItems: totalCount
    };
  }

  /**
   * Assign an artisan to a ticket
   */
  static async assignArtisanToTicket(ticketId, assignmentData) {
    try {
      // Ensure adapter is initialized
      await ensureAdapterInitialized();
      
      console.log('🔍 [ASSIGN] Looking for ticket with ID:', ticketId);
      console.log('🔍 [ASSIGN] Assignment data:', assignmentData);
      
      // Validate ticket exists
      const existingTicket = await adapter.getTicketById(ticketId);
      console.log('🔍 [ASSIGN] Found ticket:', existingTicket ? 'YES' : 'NO');
      
      if (!existingTicket) {
        console.error('❌ [ASSIGN] Ticket not found with ID:', ticketId);
        throw new Error('Ticket not found');
      }

      // Initialize assignedArtisans array if it doesn't exist
      const assignedArtisans = existingTicket.assignedArtisans || [];
      
      // Check if artisan is already assigned
      const isAlreadyAssigned = assignedArtisans.some(artisan => artisan.userId === assignmentData.userId);
      if (isAlreadyAssigned) {
        throw new Error('Artisan is already assigned to this ticket');
      }

      // Add new artisan assignment
      assignedArtisans.push(assignmentData);

      // Update ticket with new assignment
      const updateData = { assignedArtisans };
      const result = await adapter.updateTicket(ticketId, updateData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to assign artisan');
      }

      // Send notification to artisan about assignment
      try {
        const { NotificationService, NOTIFICATION_TYPES, CHANNELS } = await import('@/lib/notificationService.js');
        
        console.log(`📧 Sending artisan assignment notification to artisan ${assignmentData.userId}`);
        
        // Fetch artisan details
        const db = require('@/lib/database.js').db;
        const usersCollection = await db.dbUsers();
        const artisan = await usersCollection.findOne({ userID: assignmentData.userId });
        
        if (artisan && artisan.email) {
          // Get ticket number for notification
          const ticketNumber = result.ticket?.ticketID || ticketId.slice(-8);
          const adminBaseUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001';
          const ticketUrl = `${adminBaseUrl}/dashboard/custom-tickets/${result.ticket?.ticketID}`;
          
          await NotificationService.createNotification({
            userId: assignmentData.userId,
            type: NOTIFICATION_TYPES.CUSTOM_TICKET_ARTISAN_ASSIGNED,
            title: `You've Been Assigned to Custom Ticket #${ticketNumber}`,
            message: `A new custom design ticket has been assigned to you.`,
            channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
            data: {
              ticketNumber,
              artisanName: artisan.firstName || artisan.email,
              artisanType: assignmentData.artisanType,
              ticketTitle: result.ticket?.title || 'Custom Design Request',
              ticketUrl
            },
            templateName: 'custom_ticket_artisan_assigned',
            recipientEmail: artisan.email
          });
          
          console.log(`✅ Artisan assignment notification sent to ${artisan.email}`);
        } else {
          console.warn(`⚠️ Could not send notification - artisan not found or has no email`);
        }
        
        // Also notify the client that an artisan has been assigned
        if (result.ticket?.userID) {
          const client = await usersCollection.findOne({ userID: result.ticket.userID });
          
          if (client && client.email) {
            const ticketNumber = result.ticket?.ticketID || ticketId.slice(-8);
            
            await NotificationService.createNotification({
              userId: result.ticket.userID,
              type: NOTIFICATION_TYPES.CUSTOM_TICKET_STATUS_CHANGED,
              title: `Artisan Assigned to Your Ticket #${ticketNumber}`,
              message: `${assignmentData.userName || 'An artisan'} has been assigned to work on your custom design.`,
              channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
              data: {
                ticketNumber,
                artisanName: assignmentData.userName || 'An artisan',
                status: 'Artisan Assigned'
              },
              templateName: 'custom_ticket_status_changed',
              recipientEmail: client.email
            });
            
            console.log(`✅ Client notification sent to ${client.email}`);
          }
        }
      } catch (notificationError) {
        console.error('⚠️ Failed to send artisan assignment notification:', notificationError);
        // Don't fail the API if notifications fail
      }

      return {
        ticket: result.ticket
      };
    } catch (error) {
      console.error('CustomTicketService.assignArtisanToTicket error:', error);
      throw error;
    }
  }

  /**
   * Remove an artisan from a ticket
   */
  static async removeArtisanFromTicket(ticketId, artisanUserId) {
    try {
      // Ensure adapter is initialized
      await ensureAdapterInitialized();
      
      // Validate ticket exists
      const existingTicket = await adapter.getTicketById(ticketId);
      if (!existingTicket) {
        throw new Error('Ticket not found');
      }

      // Remove artisan from assignments
      const assignedArtisans = (existingTicket.assignedArtisans || []).filter(
        artisan => artisan.userId !== artisanUserId
      );

      // Update ticket
      const updateData = { assignedArtisans };
      const result = await adapter.updateTicket(ticketId, updateData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to remove artisan');
      }

      return {
        ticket: result.ticket
      };
    } catch (error) {
      console.error('CustomTicketService.removeArtisanFromTicket error:', error);
      throw error;
    }
  }

  /**
   * Get tickets assigned to a specific artisan
   */
  static async getArtisanTickets(filters = {}) {
    try {
      console.log('🔍 [SERVICE] CustomTicketService.getArtisanTickets - Starting with filters:', filters);
      
      // Ensure adapter is initialized
      await ensureAdapterInitialized();
      
      // Pass filters directly to adapter - no modification needed
      console.log('🔄 [SERVICE] CustomTicketService.getArtisanTickets - Calling adapter.getAllTickets with:', filters);
      const result = await adapter.getAllTickets(filters);
      
      console.log('✅ [SERVICE] CustomTicketService.getArtisanTickets - Result from adapter:', {
        ticketCount: result?.tickets?.length || 0,
        totalCount: result?.totalCount || 0,
        hasResult: !!result
      });
      
      return result;
    } catch (error) {
      console.error('CustomTicketService.getArtisanTickets error:', error);
      throw new Error(`Service error: ${error.message}`);
    }
  }
}