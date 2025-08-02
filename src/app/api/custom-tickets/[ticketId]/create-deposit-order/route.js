import { NextResponse } from 'next/server';
import { CustomTicketService } from '@/services/customTicket.service';
import { shopifyOrderService } from '../../../../../services/shopifyOrder.service';
import { UserService } from '../../../../../services/user.service';

export async function POST(request, { params }) {
  try {
    const ticketId = params.ticketId;
    
    // Get the ticket
    const ticket = await CustomTicketService.fetchById(ticketId);
    
    // Get customer info from the ticket's userID
    const customerInfo = await UserService.getCustomerInfoForTicket(ticket);

    // Create Shopify deposit order
    const orderResult = await shopifyOrderService.createDepositOrder(ticket, customerInfo);
    
    // Link the order to the ticket
    const updatedTicket = await CustomTicketService.linkShopifyOrder(
      ticketId, 
      'deposit', 
      orderResult.orderId
    );
    
    return NextResponse.json({ 
      success: true, 
      data: {
        ticket: updatedTicket,
        shopifyOrder: orderResult
      }
    });
  } catch (error) {
    console.error('Error creating deposit order:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
