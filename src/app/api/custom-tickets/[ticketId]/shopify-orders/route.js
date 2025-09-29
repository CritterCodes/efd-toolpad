/**
 * Custom Tickets Shopify Orders Route - Constitutional MVC Architecture
 * Handles linking Shopify orders to custom tickets
 */

import { NextResponse } from 'next/server';
import CustomTicketController from '../../controller.js';

export async function POST(request, { params }) {
  try {
    const ticketId = params.ticketId;
    const { orderType, orderId } = await request.json();
    
    // Delegate to MVC controller
    return await CustomTicketController.linkShopifyOrder(ticketId, orderType, orderId);
    
  } catch (error) {
    console.error('Shopify orders route error:', error);
    return Response.json({
      success: false,
      error: 'Failed to parse request data'
    }, { status: 400 });
  }
}
