/**
 * Custom Tickets Deposit Order Route - Constitutional MVC Architecture
 * Handles deposit order creation for custom tickets
 */

import { NextResponse } from 'next/server';
import CustomTicketController from '../../controller.js';

export async function POST(request, { params }) {
  try {
    const ticketId = params.ticketId;
    const orderData = await request.json();
    
    // Delegate to MVC controller
    return await CustomTicketController.createDepositOrder(ticketId, orderData);
    
  } catch (error) {
    console.error('Create deposit order route error:', error);
    return Response.json({
      success: false,
      error: 'Failed to parse request data'
    }, { status: 400 });
  }
}
