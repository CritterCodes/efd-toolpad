/**
 * Custom Tickets Final Order Route - Constitutional MVC Architecture
 * Handles final order creation for custom tickets
 */

import { NextResponse } from 'next/server';
import CustomTicketController from '../../controller.js';

export async function POST(request, { params }) {
  try {
    const ticketId = params.ticketId;
    const orderData = await request.json();
    
    // Delegate to MVC controller
    return await CustomTicketController.createFinalOrder(ticketId, orderData);
    
  } catch (error) {
    console.error('Create final order route error:', error);
    return Response.json({
      success: false,
      error: 'Failed to parse request data'
    }, { status: 400 });
  }
}
