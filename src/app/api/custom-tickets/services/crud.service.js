import { getCustomTicketsAdapter } from '@/api-clients/customTicketsMicroserviceAdapter.js';
import CustomTicketModel from '../model.js';
import { db } from '@/lib/database';

const adapter = getCustomTicketsAdapter({
  mode: process.env.MICROSERVICE_MODE || 'embedded'
});

let adapterInitialized = false;
export const ensureAdapterInitialized = async () => {
  if (!adapterInitialized) {
    await adapter.initializeEmbeddedService();
    adapterInitialized = true;
  }
};

export class CrudService {
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

}
