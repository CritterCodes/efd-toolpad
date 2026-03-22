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

export class AssignmentsService {
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
              const shopBaseUrl = process.env.NEXT_PUBLIC_SHOP_URL || 'http://localhost:3000';
              const artisanProfileUrl = `${shopBaseUrl}/vendors/${assignmentData.artisanSlug || 'profile'}`;
              const clientPortalUrl = `${shopBaseUrl}/custom-work/portal`;
              
              // Format real name
              const artisanRealName = assignmentData.artisanFirstName && assignmentData.artisanLastName 
                ? `${assignmentData.artisanFirstName} ${assignmentData.artisanLastName}`
                : (assignmentData.artisanFirstName || 'Your Artisan');
              
              await NotificationService.createNotification({
                userId: result.ticket.userID,
                type: NOTIFICATION_TYPES.CUSTOM_TICKET_ARTISAN_ASSIGNED,
                title: `🎨 Your Artisan Has Been Assigned - ${assignmentData.artisanBusinessName || 'Your Artisan'}`,
                message: `${assignmentData.artisanBusinessName || 'An artisan'} has been assigned to work on your custom design.`,
                channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
                data: {
                  ticketNumber,
                  artisanBusinessName: assignmentData.artisanBusinessName || 'Your Artisan',
                  artisanRealName: artisanRealName,
                  artisanType: assignmentData.artisanType || 'Custom Work',
                  artisanProfileUrl,
                  clientPortalUrl
                },
                templateName: 'custom_ticket_artisan_assigned_client',
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
