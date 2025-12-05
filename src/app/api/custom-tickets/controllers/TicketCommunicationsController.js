/**
 * Ticket Communications Controller
 * Handles communication operations for tickets
 * Constitutional Architecture - Under 300 lines
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/database.js';
import { NotificationService, NOTIFICATION_TYPES, CHANNELS } from '@/lib/notificationService.js';
import { uploadBase64ToS3 } from '@/utils/s3.util.js';

class TicketCommunicationsController {
  /**
   * Add a communication to a ticket
   */
  static async addCommunication(request, { params }) {
    try {
      const { ticketId } = params || {};
      
      if (!ticketId) {
        return NextResponse.json(
          { error: 'Ticket ID is required' },
          { status: 400 }
        );
      }

      const body = await request.json();
      const { message, type = 'chat', from = 'admin', to = 'client', fromName = 'Artisan', images = [], link } = body;

      console.log('📨 TicketCommunicationsController.addCommunication received:', {
        message,
        type,
        from,
        imagesCount: images?.length || 0,
        imagesFirstItem: images?.[0] ? { name: images[0].name, type: images[0].type, hasData: !!images[0].data } : null,
        link
      });

      // Validate required fields
      if (!message?.trim() && (!images || images.length === 0) && !link) {
        return NextResponse.json(
          { error: 'Message content, images, or link is required' },
          { status: 400 }
        );
      }

      // Create communication data
      const communicationData = {
        message: message?.trim() || '',
        type,
        from,
        to,
        fromName,
        date: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };

      // Process and upload images if provided
      if (images && images.length > 0) {
        try {
          console.log(`🖼️ Processing ${images.length} image(s) for upload...`);
          const uploadedImages = [];
          
          for (const img of images) {
            console.log(`📸 Image check - has data: ${!!img.data}, starts with data: ${img.data?.startsWith('data:')}, type: ${img.type}, name: ${img.name}`);
            
            if (img.data && img.data.startsWith('data:')) {
              console.log(`✅ Image ${img.name} has valid base64 data, uploading to S3...`);
              // Convert base64 to S3 URL
              const s3Url = await uploadBase64ToS3(
                img.data,
                `communications/ticket-${ticketId}/image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                img.type || 'image/png'
              );
              console.log(`✅ Image ${img.name} uploaded to S3: ${s3Url}`);
              uploadedImages.push({
                url: s3Url,
                name: img.name || 'image.png',
                type: img.type || 'image/png'
              });
            } else {
              console.warn(`⚠️ Image ${img.name} skipped - no valid base64 data`);
            }
          }
          
          console.log(`🎯 Successfully processed ${uploadedImages.length} of ${images.length} images`);
          if (uploadedImages.length > 0) {
            communicationData.images = uploadedImages;
          }
        } catch (imageError) {
          console.error('⚠️ Error uploading images:', imageError);
          // Continue without images if upload fails
        }
      }

      // Validate and add link if provided
      if (link) {
        try {
          const linkUrl = new URL(link);
          communicationData.link = linkUrl.toString();
        } catch (linkError) {
          console.warn('⚠️ Invalid link URL provided:', link);
          // Continue without link if validation fails
        }
      }

      // Get database collection
      const collection = await db.dbCustomTickets();
      
      // Get ticket first to get client info
      const ticket = await collection.findOne({
        $or: [
          { ticketID: ticketId },
          { _id: ticketId }
        ]
      });

      if (!ticket) {
        return NextResponse.json(
          { error: 'Ticket not found' },
          { status: 404 }
        );
      }

      // Add communication to ticket
      const result = await collection.updateOne(
        {
          $or: [
            { ticketID: ticketId },
            { _id: ticketId }
          ]
        },
        {
          $push: { 
            communications: communicationData 
          },
          $set: { 
            updatedAt: new Date().toISOString() 
          }
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          { error: 'Ticket not found' },
          { status: 404 }
        );
      }

      if (result.modifiedCount === 0) {
        return NextResponse.json(
          { error: 'Failed to add communication' },
          { status: 500 }
        );
      }

      // Get updated ticket
      const updatedTicket = await collection.findOne({
        $or: [
          { ticketID: ticketId },
          { _id: ticketId }
        ]
      });

      // Send notification if message is FROM admin/artisan TO client
      if (from === 'admin' && to === 'client' && ticket.userID) {
        try {
          const ticketNumber = ticket.ticketID || ticketId.slice(-8);
          
          // Fetch user to get their email
          const usersCollection = await db.dbUsers();
          const user = await usersCollection.findOne({ userID: ticket.userID });
          
          if (user && user.email) {
            console.log(`📧 Sending message notification to client ${user.email} for ticket ${ticketNumber}`);
            
            await NotificationService.createNotification({
              userId: ticket.userID,
              type: NOTIFICATION_TYPES.CUSTOM_TICKET_MESSAGE_SENT,
              title: `New Message on Ticket #${ticketNumber}`,
              message: `You have a new message from the artisan regarding your custom design.`,
              channels: [CHANNELS.IN_APP, CHANNELS.EMAIL],
              data: {
                ticketNumber,
                fromName: fromName || 'Artisan',
                message: message.substring(0, 100) + (message.length > 100 ? '...' : '')
              },
              templateName: 'custom_ticket_message_sent',
              recipientEmail: user.email
            });
            
            console.log(`✅ Message notification sent to ${user.email}`);
          } else {
            console.warn(`⚠️ Could not send notification - user not found or has no email for ticket ${ticketNumber}`);
          }
        } catch (notificationError) {
          console.error('⚠️ Failed to send message notification:', notificationError);
          // Don't fail the API if notifications fail
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Communication added successfully',
        communication: communicationData,
        ticket: updatedTicket
      });

    } catch (error) {
      console.error('Error adding communication:', error);
      return NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      );
    }
  }

  /**
   * Get communications for a ticket
   */
  static async getCommunications(request, { params }) {
    try {
      const { ticketId } = params || {};
      
      if (!ticketId) {
        return NextResponse.json(
          { error: 'Ticket ID is required' },
          { status: 400 }
        );
      }

      // Get database collection
      const collection = await db.dbCustomTickets();
      
      // Get ticket
      const ticket = await collection.findOne({
        $or: [
          { ticketID: ticketId },
          { _id: ticketId }
        ]
      });

      if (!ticket) {
        return NextResponse.json(
          { error: 'Ticket not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        communications: ticket.communications || [],
        clientFeedback: ticket.clientFeedback || [],
        count: (ticket.communications?.length || 0) + (ticket.clientFeedback?.length || 0)
      });

    } catch (error) {
      console.error('Error getting communications:', error);
      return NextResponse.json(
        { error: 'Internal server error', details: error.message },
        { status: 500 }
      );
    }
  }
}

export default TicketCommunicationsController;