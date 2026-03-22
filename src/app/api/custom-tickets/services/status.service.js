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

export class StatusService {
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

}
