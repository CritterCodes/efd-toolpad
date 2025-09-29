/**
 * Ticket Communications Controller
 * Handles communication operations for tickets
 * Constitutional Architecture - Under 300 lines
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/database.js';

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
      const { message, type = 'chat', from = 'admin', to = 'client' } = body;

      // Validate required fields
      if (!message?.trim()) {
        return NextResponse.json(
          { error: 'Message content is required' },
          { status: 400 }
        );
      }

      // Create communication data
      const communicationData = {
        message: message.trim(),
        type,
        from,
        to,
        date: new Date().toISOString(),
        timestamp: new Date().toISOString()
      };

      // Get database collection
      const collection = await db.dbCustomTickets();
      
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